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

	// Upgrade progress states
	const ClickUpgradeTime = 5; // seconds to complete click upgrade
	const CPSUpgradeTime = 10; // seconds to complete CPS upgrade
	let ClickUpgradeProgress = $state(0); // 0 to 1, progress toward click upgrade
	let CPSUpgradeProgress = $state(0); // 0 to 1, progress toward CPS upgrade
	let PendingCPSIncrement = $state(0); // pending CPS increment to apply after upgrade

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

	let CanBuyClickUpgrade = $derived(
		PlayerTotal >= NextClickUpgradeCost && ClickUpgradeProgress === 0
	);
	let CanBuyCPSUpgrade = $derived(PlayerTotal >= CPSUpgradeCost() && CPSUpgradeProgress === 0);
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
		if (PlayerTotal >= NextClickUpgradeCost && ClickUpgradeProgress === 0) {
			PlayerTotal -= NextClickUpgradeCost;
			ClickUpgradeProgress = 0.01; // start the progress
			AddToHistory(`Started Click Upgrade Level +1`);
		}
	}

	function BuyCPSUpgrade() {
		const cost = CPSUpgradeCost();
		const level = Math.round(CoinsPerSecond * 10);
		const increment = CPSIncrementForLevel(level);
		if (PlayerTotal >= cost && CPSUpgradeProgress === 0) {
			PlayerTotal -= cost;
			PendingCPSIncrement = increment;
			CPSUpgradeProgress = 0.01; // start the progress
			AddToHistory(`Started CPS Upgrade +${increment.toFixed(2)}`);
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
			ClickUpgradeProgress = 0;
			CPSUpgradeProgress = 0;
			PendingCPSIncrement = 0;
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

			// accumulate click upgrade progress
			if (ClickUpgradeProgress > 0) {
				ClickUpgradeProgress += (DeltaTimeSeconds * BoostMultiplier) / ClickUpgradeTime;
				if (ClickUpgradeProgress >= 1) {
					PerClickAmount += 1;
					AddToHistory(`Completed Click Upgrade Level ${PerClickAmount}`);
					ClickUpgradeProgress = 0;
				}
			}

			// accumulate CPS upgrade progress
			if (CPSUpgradeProgress > 0) {
				CPSUpgradeProgress += (DeltaTimeSeconds * BoostMultiplier) / CPSUpgradeTime;
				if (CPSUpgradeProgress >= 1) {
					CoinsPerSecond += PendingCPSIncrement;
					AddToHistory(
						`Completed CPS Upgrade +${PendingCPSIncrement.toFixed(2)} (CPS ${CoinsPerSecond.toFixed(2)})`
					);
					PendingCPSIncrement = 0;
					CPSUpgradeProgress = 0;
				}
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
				isDarkMode,
				ClickUpgradeProgress,
				CPSUpgradeProgress,
				PendingCPSIncrement
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
			ClickUpgradeProgress = s.ClickUpgradeProgress ?? 0;
			CPSUpgradeProgress = s.CPSUpgradeProgress ?? 0;
			PendingCPSIncrement = s.PendingCPSIncrement ?? 0;
			document.documentElement.classList.toggle('dark', isDarkMode);
		}
	});

	// Collapsible state for sidebar sections
	let isEngineCollapsed = $state(false);
	let isInventoryCollapsed = $state(false);
	let isEquipmentCollapsed = $state(false);
	let isUpgradesCollapsed = $state(false);

	// Derived state for all collapsed
	let allCollapsed = $derived(
		isEngineCollapsed && isInventoryCollapsed && isEquipmentCollapsed && isUpgradesCollapsed
	);

	function toggleAllSections() {
		const newState = !allCollapsed;
		isEngineCollapsed = newState;
		isInventoryCollapsed = newState;
		isEquipmentCollapsed = newState;
		isUpgradesCollapsed = newState;
	}
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

			<div class="sidebar-controls">
				<button onclick={toggleAllSections} class="toggle-all-button button-small">
					{allCollapsed ? 'Expand All' : 'Collapse All'}
				</button>
			</div>

			<div class="sidebar-engine">
				<button class="engine-header" onclick={() => (isEngineCollapsed = !isEngineCollapsed)}>
					<div class="engine-title">⚙️ Engine</div>
					<span class="collapse-arrow">{isEngineCollapsed ? '▶' : '▼'}</span>
				</button>
				{#if !isEngineCollapsed}
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
				{/if}
			</div>

			<div class="sidebar-inventory">
				<button
					class="inventory-header"
					onclick={() => (isInventoryCollapsed = !isInventoryCollapsed)}
				>
					<div class="inventory-title">🎒 Inventory</div>
					<span class="collapse-arrow">{isInventoryCollapsed ? '▶' : '▼'}</span>
				</button>
				{#if !isInventoryCollapsed}
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
				{/if}
			</div>

			<div class="sidebar-equipment">
				<button
					class="equipment-header"
					onclick={() => (isEquipmentCollapsed = !isEquipmentCollapsed)}
				>
					<div class="equipment-title">🛠️ Equipment</div>
					<span class="collapse-arrow">{isEquipmentCollapsed ? '▶' : '▼'}</span>
				</button>
				{#if !isEquipmentCollapsed}
					<div class="equipment-content">
						<div class="equipment-grid">
							<button class="equipment-item progress" onclick={HandleClick}>
								<!-- progress fill -->
								<div class="bar" style="width: {(ManualProgress * 100).toFixed(2)}%"></div>
								<!-- visible content on top -->
								<span class="progress-content">
									Clicker (+{PerClickAmount})
								</span>
							</button>
							<button class="equipment-item progress" disabled>
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
				{/if}
			</div>

			<div class="sidebar-upgrades">
				<button
					class="upgrades-header"
					onclick={() => (isUpgradesCollapsed = !isUpgradesCollapsed)}
				>
					<div class="upgrades-title">⚙️ Upgrades</div>
					<span class="collapse-arrow">{isUpgradesCollapsed ? '▶' : '▼'}</span>
				</button>
				{#if !isUpgradesCollapsed}
					<div class="upgrades-content">
						<div class="upgrades-grid">
							<button
								class="upgrades-item progress {!CanBuyClickUpgrade || ClickUpgradeProgress > 0
									? 'disabled'
									: ''}"
								onclick={BuyClickUpgrade}
							>
								<div class="bar" style="width: {(ClickUpgradeProgress * 100).toFixed(2)}%"></div>
								<span class="progress-content">
									Click (Cost: {NextClickUpgradeCost})
								</span>
							</button>
							<button
								class="upgrades-item progress {!CanBuyCPSUpgrade || CPSUpgradeProgress > 0
									? 'disabled'
									: ''}"
								onclick={BuyCPSUpgrade}
							>
								<div class="bar" style="width: {(CPSUpgradeProgress * 100).toFixed(2)}%"></div>
								<span class="progress-content">
									Auto (Cost: {CPSUpgradeCost()})
								</span>
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="main">
			<div class="main-header">
				<div class="header-content">
					<div class="header-title"><p>Header.</p></div>
					<div class="header-toolbar">
						<div class="theme-toggle">
							<button class="button-small" onclick={ToggleTheme}
								>{isDarkMode ? '☀️ Light' : '🌙 Dark'}</button
							>
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
		--bg-color-2: #f0f0f0;
		--bg-color-3: #e0e0e0;
		--text-color: black;
		--border-color: black;
		--button-bg: white;
		--button-hover: #d6d6d6;
		--progress-bg: greenyellow;
	}

	:global(:root.dark) {
		--bg-color: #404040;
		--bg-color-2: #383838;
		--bg-color-3: #303030;
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
		overflow: auto;
	}

	/* Buttons */
	button {
		background-color: var(--button-bg);
		color: var(--text-color);
		box-shadow: 2px 2px 0 0 rgba(0, 0, 0, 0.8);
	}

	button:hover {
		background-color: var(--button-hover);
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.button-small {
		font-size: xx-small;
	}

	/* Sidebar */
	.sidebar {
		min-width: 360px;
		border-right: 1px solid var(--border-color);
		border-top-left-radius: 10px;
		overflow-y: auto;
		box-shadow: 1px 0 20px 0 rgba(0, 0, 0, 0.2);
	}

	/* Sidebar Header */

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: var(--global-padding);
		border-bottom: 1px solid var(--border-color);
		box-shadow: 0 1px 20px 0 rgba(0, 0, 0, 0.2);
		position: relative;
		z-index: 1;
		justify-content: space-between;
	}

	/* .sidebar-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--bg-color);
        filter: blur(2px) grayscale(50%);
        z-index: -1; 
    } */

	.sidebar-header-icon {
		font-size: xx-large;
	}

	.sidebar-header-text {
		flex-grow: 1;
	}

	.sidebar-header-title {
		font-size: large;
	}

	.sidebar-header-subtitle {
		font-size: small;
	}

	/* Sidebar Controls */
	.sidebar-controls {
		padding: 0.5rem;
		border-bottom: 1px solid var(--border-color);
		z-index: 1;
		display: flex;
		justify-content: right;
	}

	.inventory-grid {
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.inventory-item {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.inventory-item-name,
	.inventory-item-value {
		padding: 0.5rem;
	}

	.inventory-item-name {
		flex-grow: 1;
	}

	.inventory-item-value {
		text-align: right;
	}

	.sidebar-engine,
	.sidebar-inventory,
	.sidebar-equipment,
	.sidebar-upgrades {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.engine-header,
	.inventory-header,
	.equipment-header,
	.upgrades-header {
		display: flex;
		padding: 0.5rem;
		border: 0;
		border-radius: 0;
		border-bottom: 1px solid var(--border-color);
		box-shadow: 0 1px 20px 0 rgba(0, 0, 0, 0.2);
		position: relative;
		z-index: 1;
		background-color: var(--bg-color-2);
		color: var(--text-color);
		/* backdrop-filter: blur(5px) grayscale(30%); */
		align-items: center;
	}

	/* .engine-header::before,
    .inventory-header::before,
    .equipment-header::before,
    .upgrades-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--bg-color);
        filter: blur(2px) grayscale(50%);
        z-index: -1;
    } */

	.collapse-arrow {
		float: right;
		font-size: xx-small;
	}

	.engine-title,
	.inventory-title,
	.equipment-title,
	.upgrades-title {
		flex-grow: 1;
		text-align: left;
	}

	.engine-content,
	.inventory-content,
	.equipment-content,
	.upgrades-content {
		background-color: var(--bg-color-3);
		border-bottom: 1px solid var(--border-color);
		padding: 0.5rem;
	}

	.engine-item,
	.inventory-item,
	.equipment-item,
	.upgrades-item {
		display: flex;
		gap: 0.5rem;
	}

	.engine-item-name {
		flex-grow: 1;
		background-color: var(--button-bg);
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
	.upgrades-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.main {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: auto;
	}

	.main-header {
		padding: var(--global-padding);
		border-bottom: 1px solid var(--border-color);
		box-shadow: 1px 0 20px 0 rgba(0, 0, 0, 0.2);
	}

	.main-content {
		flex-grow: 1;
		overflow-y: auto;
		padding: var(--global-padding);
		border-bottom: 1px solid var(--border-color);
	}

	.main-footer {
		padding: var(--global-padding);
		box-shadow: -1px 0 20px 0 rgba(0, 0, 0, 0.2);
	}

	/* progress containers */
	.progress {
		position: relative;
		overflow: hidden;
		transition: background 0.2s;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background-color: var(--button-bg);
	}

	/* .progress:hover:not(:disabled) {
        background: white;
    } */

	.progress.disabled {
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

	.engine-header,
	.inventory-header,
	.equipment-header,
	.upgrades-header {
		cursor: pointer;
	}
</style>
