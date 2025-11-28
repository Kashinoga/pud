<script lang="ts">
	// Local state
	let PlayerTotal = $state(0); // starting currency for testing
	let PerClickAmount = $state(1);
	let CoinsPerSecond = $state(0); // idle income per second

	// Action history
	let ActionHistory = $state<string[]>([]);
	const MaxHistoryItems = 10;

	function AddToHistory(Action: string) {
		ActionHistory = [Action, ...ActionHistory].slice(0, MaxHistoryItems);
	}

	// Tick state for discrete CPS application
	const TickIntervalSeconds = 1; // seconds per tick
	let TickElapsedSeconds = $state(0); // seconds elapsed within current tick

	// Manual extraction state
	const ManualExtractionTime = 1; // seconds to complete manual extraction
	let ManualProgress = $state(0); // 0 to 1, progress toward manual extraction
	let PendingManualClicks = $state(0); // number of manual clicks pending extraction

	// Boost state
	let BoostMultiplier = $state(1); // 1x = normal speed
	let BoostTimeRemaining = $state(0); // seconds left on current boost
	const BoostCost = 10;
	const BoostDurationSeconds = 10;
	const BoostSpeedMultiplier = 2; // 2x speed

	// Derive values
	let NextClickUpgradeCost = $derived(Math.floor(10 * Math.pow(1.15, PerClickAmount)));

	// CPS upgrade follows a curved growth: soft-exponential * polynomial term for smoothing
	const CPSUpgradeCost = () => {
		// interpret CoinsPerSecond as CPS value; assume each upgrade gives +0.1 CPS (base)
		const Level = Math.round(CoinsPerSecond * 10); // number of CPS upgrades bought
		const Base = 1;

		// soft exponential for steady escalation
		const SoftExp = Math.pow(1, Level);

		// polynomial term to add curvature (gentle early, stronger later)
		const Poly = 1 + Math.pow(Level, 1) / 10;
		console.log('Test: ', Math.max(1, Math.floor(Base * SoftExp * Poly)));
		console.log('PlayerTotal: ', PlayerTotal);
		return Math.max(1, Math.floor(Base * SoftExp * Poly));
	};

	// base CPS increment and curve for how much CPS each purchase grants
	const BaseCPSIncrement = 0.1;
	function CPSIncrementForLevel(Level: number) {
		// moderate growth per upgrade: gentle early, stronger later
		// tweak 1.07 to make growth faster/slower
		return BaseCPSIncrement * Math.pow(1.07, Level);
	}

	let CanBuyClickUpgrade = $derived(PlayerTotal >= NextClickUpgradeCost);
	let CanBuyCPSUpgrade = $derived(PlayerTotal >= CPSUpgradeCost());
	let CanBuyBoost = $derived(PlayerTotal >= BoostCost && BoostTimeRemaining <= 0);

	let isDarkMode = $state(false);

	function ToggleTheme() {
		isDarkMode = !isDarkMode;
		document.documentElement.classList.toggle('dark', isDarkMode);
	}

	function HandleClick() {
		PendingManualClicks += 1;
		if (ManualProgress === 0) {
			ManualProgress = 0.01; // start the progress
		}
	}

	function BuyClickUpgrade() {
		if (PlayerTotal >= NextClickUpgradeCost) {
			PlayerTotal -= NextClickUpgradeCost;
			PerClickAmount += 1;
			AddToHistory(`Bought Click Upgrade Level +1 (Level ${PerClickAmount})`);
		}
	}

	function BuyCPSUpgrade() {
		const cost = CPSUpgradeCost();
		const level = Math.round(CoinsPerSecond * 10);
		const increment = CPSIncrementForLevel(level);
		if (PlayerTotal >= cost) {
			PlayerTotal -= cost;
			// increase CPS by a curved increment instead of a fixed value
			CoinsPerSecond += increment;
			AddToHistory(
				`Bought CPS Upgrade +${increment.toFixed(2)} (CPS ${CoinsPerSecond.toFixed(2)})`
			);
		}
	}

	function BuyTickBoost() {
		if (PlayerTotal >= BoostCost && BoostTimeRemaining <= 0) {
			PlayerTotal -= BoostCost;
			BoostTimeRemaining = BoostDurationSeconds;
			BoostMultiplier = BoostSpeedMultiplier;
			AddToHistory(
				`Activated Tick Boost (${BoostDurationSeconds}s @ ${(BoostSpeedMultiplier * 100).toFixed(0)}%)`
			);
		}
	}

	function ResetGame() {
		if (confirm('Are you sure? This will reset all progress.')) {
			PlayerTotal = 0;
			PerClickAmount = 1;
			CoinsPerSecond = 0;
			TickElapsedSeconds = 0;
			BoostTimeRemaining = 0;
			BoostMultiplier = 1;
			ActionHistory = [];
			localStorage.removeItem('save');
		}
	}

	// Idle loop
	let LastFrameTimestamp = performance.now();
	$effect(() => {
		let AnimationFrameId: number;
		const AnimationStep = (CurrentTimestamp: number) => {
			const DeltaTimeSeconds = (CurrentTimestamp - LastFrameTimestamp) / 1000;
			LastFrameTimestamp = CurrentTimestamp;

			// Update boost timer
			if (BoostTimeRemaining > 0) {
				BoostTimeRemaining -= DeltaTimeSeconds;
				if (BoostTimeRemaining <= 0) {
					BoostTimeRemaining = 0;
					BoostMultiplier = 1;
				}
			}

			// accumulate auto extraction progress
			if (CoinsPerSecond > 0) {
				TickElapsedSeconds += DeltaTimeSeconds * BoostMultiplier;
			}

			// accumulate manual extraction progress
			if (PendingManualClicks > 0) {
				ManualProgress += (DeltaTimeSeconds * BoostMultiplier) / ManualExtractionTime;
			}

			// apply auto ticks
			if (TickElapsedSeconds >= TickIntervalSeconds) {
				const CompletedTicks = Math.floor(TickElapsedSeconds / TickIntervalSeconds);
				PlayerTotal += CoinsPerSecond * CompletedTicks;
				TickElapsedSeconds -= CompletedTicks * TickIntervalSeconds;
			}

			// apply manual extraction
			if (ManualProgress >= 1) {
				const ManualIncome = PerClickAmount * PendingManualClicks;
				PlayerTotal += ManualIncome;
				AddToHistory(`Extracted ${ManualIncome} Data Shards from manual clicks`);
				PendingManualClicks = 0;
				ManualProgress = 0;
			}

			AnimationFrameId = requestAnimationFrame(AnimationStep);
		};
		AnimationFrameId = requestAnimationFrame(AnimationStep);
		return () => cancelAnimationFrame(AnimationFrameId);
	});

	// Persistence
	$effect(() => {
		localStorage.setItem(
			'save',
			JSON.stringify({
				PlayerTotal,
				PerClickAmount,
				CoinsPerSecond,
				TickElapsedSeconds,
				ManualProgress,
				PendingManualClicks,
				BoostTimeRemaining,
				BoostMultiplier,
				ActionHistory,
				isDarkMode
			})
		);
	});

	$effect(() => {
		const raw = localStorage.getItem('save');
		if (raw) {
			const s = JSON.parse(raw);
			PlayerTotal = s.PlayerTotal ?? s.total ?? 0;
			PerClickAmount = s.PerClickAmount ?? s.perClick ?? 1;
			CoinsPerSecond = s.CoinsPerSecond ?? s.cps ?? 0;
			TickElapsedSeconds = s.TickElapsedSeconds ?? s.tickElapsed ?? 0;
			ManualProgress = s.ManualProgress ?? 0;
			PendingManualClicks = s.PendingManualClicks ?? 0;
			BoostTimeRemaining = s.BoostTimeRemaining ?? 0;
			BoostMultiplier = s.BoostMultiplier ?? 1;
			ActionHistory = s.ActionHistory ?? [];
			isDarkMode = s.isDarkMode ?? false;
			document.documentElement.classList.toggle('dark', isDarkMode);
		}
	});
</script>

<div class="body-wrapper">
	<div class="container">
		<div class="sidebar">
			<div class="sidebar-header">
				<div class="sidebar-header-icon">🗃️</div>
				<div class="sidebar-header-text">
					<div class="sidebar-header-title">Pocket Universe Division: Idle</div>
					<div class="sidebar-header-subtitle">
						<i>A big picture game about the small things.</i>
					</div>
				</div>
			</div>
			<div class="sidebar-engine">
				<div class="engine-header">⚙️ Engine</div>
				<div class="engine-content">
					<div class="engine-item">
						<div class="engine-item-name">Auto Extraction</div>
						<div class="engine-item-border"></div>
						<div class="engine-item-value progress">
							<div
								class="bar"
								style="width: {(
									Math.min(1, TickElapsedSeconds / TickIntervalSeconds) * 100
								).toFixed(2)}%"
							></div>
							<span class="progress-content">
								{Math.max(0, TickIntervalSeconds - TickElapsedSeconds).toFixed(4)}s
							</span>
						</div>
					</div>
				</div>
			</div>
			<div class="sidebar-inventory">
				<div class="inventory-header">🎒 Inventory</div>
				<div class="inventory-content">
					<div class="inventory-grid">
						<div class="inventory-item">
							<div class="inventory-item-name">Data Shards</div>
							<div class="inventory-item-value">
								{PlayerTotal.toFixed(4)}
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="sidebar-equipment">
				<div class="equipment-header">🛠️ Equipment</div>
				<div class="equipment-content">
					<div class="equipment-grid">
						<button class="progress button-progress" onclick={HandleClick}>
							<!-- progress fill -->
							<div class="bar" style="width: {(ManualProgress * 100).toFixed(2)}%"></div>
							<!-- visible content on top -->
							<div class="progress-content">
								Clicker (+{PerClickAmount})
							</div>
						</button>
						<button class="progress button-progress" disabled>
							<!-- progress fill -->
							<div
								class="bar"
								style="width: {(
									Math.min(1, TickElapsedSeconds / TickIntervalSeconds) * 100
								).toFixed(2)}%"
							></div>
							<!-- visible content on top -->
							<span class="progress-content">
								Auto (+{CoinsPerSecond.toFixed(2)}/s)
							</span>
						</button>
					</div>
				</div>
			</div>
			<div class="sidebar-upgrades">
				<div class="upgrades-header">⚙️ Upgrades</div>
				<div class="upgrades-content">
					<div class="upgrade-grid">
						<button onclick={BuyClickUpgrade} disabled={!CanBuyClickUpgrade}>
							Click (Cost: {NextClickUpgradeCost})
						</button>
						<button onclick={BuyCPSUpgrade} disabled={!CanBuyCPSUpgrade}>
							Auto (Cost: {CPSUpgradeCost()})
						</button>
					</div>
				</div>
			</div>
		</div>
		<div class="main">
			<div class="main-header">
				<div class="header-content">
					<div class="header-title"><p>Header.</p></div>
					<div class="header-toolbar">
						<div class="theme-toggle">
							<button onclick={ToggleTheme}>{isDarkMode ? '☀️ Light' : '🌙 Dark'}</button>
						</div>
					</div>
				</div>
			</div>
			<div class="main-content">
				<p>Main.</p>
			</div>
			<div class="main-footer">
				<p>Footer.</p>
			</div>
		</div>
	</div>
</div>

<style>
	:global(:root) {
		--global-padding: 1rem;
		--bg-color: white;
		--text-color: black;
		--border-color: black;
		--button-bg: white;
		--button-hover: #d6d6d6;
		--progress-bg: greenyellow;
	}

	:global(:root.dark) {
		--bg-color: #404040;
		--text-color: white;
		--border-color: black;
		--button-bg: #202020;
		--button-hover: #606060;
		--progress-bg: #4caf50;
	}

	:global(html) {
		margin: 0;
		padding: 0;
		background-color: var(--bg-color);
		color: var(--text-color);
		height: 100vh;
	}

	.body-wrapper {
		background-color: var(--bg-color);
		color: var(--text-color);
		border: 1px solid var(--border-color);
		border-radius: 10px;
		height: 100%;
	}

	.container {
		height: 100%;
		display: grid;
		grid-template-columns: 2fr 6fr;
		grid-template-rows: 1fr auto;
	}

	/* Buttons */
	button {
		background-color: var(--button-bg);
		color: var(--text-color);
		box-shadow: 2px 2px 0 0 rgba(0, 0, 0, 0.8);
		padding: 0.5rem;
	}

	button:hover {
		background-color: var(--button-hover);
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Sidebar */
	.sidebar {
		min-width: 360px;
		border-right: 1px solid var(--border-color);
		overflow-y: auto;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: var(--global-padding);
		border-bottom: 1px solid var(--border-color);
	}

	.sidebar-header-icon {
		font-size: xx-large;
	}

	.sidebar-header-title {
		font-size: large;
	}

	.sidebar-header-subtitle {
		font-size: small;
	}

	.sidebar-engine,
	.sidebar-inventory,
	.sidebar-equipment,
	.sidebar-upgrades {
		padding: var(--global-padding);
		border-bottom: 1px solid var(--border-color);
	}

	.inventory-grid {
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.inventory-item-name,
	.inventory-item-value {
		padding: 0.5rem;
	}

	.inventory-item {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.inventory-item-value {
		text-align: right;
	}

	.engine-item {
		display: flex;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		gap: 0.5rem;
	}

	.engine-item-name {
		flex-grow: 1;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		align-self: center;
		padding: 0.5rem;
	}

	.engine-item-border {
		border-left: 1px dotted var(--border-color);
	}

	.engine-item-value {
		padding: 0.5rem;
	}

	.equipment-grid,
	.upgrade-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.main {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.main-header {
		padding: var(--global-padding);
		border-bottom: 1px solid var(--border-color);
	}

	.main-content {
		flex-grow: 1;
		overflow-y: auto;
		padding: var(--global-padding);
		border-bottom: 1px solid var(--border-color);
	}

	.main-footer {
		padding: var(--global-padding);
	}

	/* progress containers */
	.progress {
		position: relative;
		overflow: hidden;
		transition: background 0.2s;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		/* padding: 0.5rem; */
		background-color: var(--button-bg);
	}

	/* .progress:hover:not(:disabled) {
		background: white;
	} */

	.progress:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.progress-content {
		position: relative;
		z-index: 2;
	}

	.bar {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: var(--progress-bg);
		transition: width 0.1s linear;
		z-index: 1;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>
