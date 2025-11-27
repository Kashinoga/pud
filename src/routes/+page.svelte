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

	// Event handlers
	function HandleClick() {
		PlayerTotal += PerClickAmount;
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

	// Idle loop (discrete 1s ticks; applies cps each full tick)
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

			// accumulate elapsed toward ticks (scaled by boost)
			TickElapsedSeconds += DeltaTimeSeconds * BoostMultiplier;

			// apply whole ticks
			if (TickElapsedSeconds >= TickIntervalSeconds && CoinsPerSecond > 0) {
				const CompletedTicks = Math.floor(TickElapsedSeconds / TickIntervalSeconds);
				PlayerTotal += CoinsPerSecond * CompletedTicks;
				TickElapsedSeconds -= CompletedTicks * TickIntervalSeconds;
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
				BoostTimeRemaining,
				BoostMultiplier,
				ActionHistory
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
			BoostTimeRemaining = s.BoostTimeRemaining ?? 0;
			BoostMultiplier = s.BoostMultiplier ?? 1;
			ActionHistory = s.ActionHistory ?? [];
		}
	});
</script>

<div class="container">
	<div class="sidebar">
		<div class="sidebar-header">
			<p>🗃️ Pocket Universe Division: Idle</p>
			<p><i>A big picture game about the small things.</i></p>

			<div class="ticker">
				<div class="ticker-header">🔋Ticker</div>
				<div class="ticker-time">
					<span>{Math.max(0, TickIntervalSeconds - TickElapsedSeconds).toFixed(2)}s</span>
				</div>
			</div>
			<div class="ticker-progress">
				<div
					class="ticker-progress-bar"
					style="width: {(Math.min(1, TickElapsedSeconds / TickIntervalSeconds) * 100).toFixed(2)}%"
				></div>
			</div>

			<!-- <div class="ticker">
				<label for="ticker"
					>🔋 Ticker: {Math.max(0, TickIntervalSeconds - TickElapsedSeconds).toFixed(2)}s</label
				>
				<div id="ticker-progress" class="ticker-progress">
					<div
						class="bar"
						style="width: {(Math.min(1, TickElapsedSeconds / TickIntervalSeconds) * 100).toFixed(
							2
						)}%"
					></div>
				</div>
			</div> -->
		</div>

		<div class="sidebar-inventory">
			<div class="inventory-header">🎒 Inventory</div>
			<div class="inventory-content">
				<div class="item">
					<div class="item-name">Data Shards</div>
					<div class="item-value">
						{PlayerTotal.toFixed(4)}
					</div>
				</div>
			</div>
		</div>

		<div class="sidebar-equipment">
			<div class="equipment-header">🛠️ Equipment</div>
			<div class="equipment-content">
				<div class="equipment-grid">
					<button onclick={HandleClick}>Clicker (+{PerClickAmount})</button>
					<button>Auto (+{CoinsPerSecond.toFixed(2)}/s)</button>
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
			<p>Header.</p>
		</div>
		<div class="main-content">
			<p>Main.</p>
		</div>

		<div class="main-footer">
			<p>Footer.</p>
		</div>
	</div>
</div>

<style>
	:root {
		--global-padding: 1rem;
	}

	.container {
		min-height: 100vh;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: 1fr auto;
	}

	/* Sidebar */
	.sidebar {
		border-right: 1px solid black;
	}

	.sidebar-header {
		padding: var(--global-padding);
		border-bottom: 1px solid black;
	}

	.ticker {
		display: grid;
		grid-template-columns: 1fr auto;
	}

	/* Sidebar Inventory */
	.sidebar-inventory,
	.sidebar-equipment,
	.sidebar-upgrades {
		padding: var(--global-padding);
		border-bottom: 1px solid black;
	}

	.item {
		display: grid;
		grid-template-columns: 1fr auto;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		gap: 0.5rem;
	}

	.item-name {
		border-right: 1px solid black;
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
		border-bottom: 1px solid black;
	}

	.main-content {
		flex-grow: 1;
		overflow-y: auto;
		padding: var(--global-padding);
		border-bottom: 1px solid black;
	}

	.main-footer {
		padding: var(--global-padding);
	}

	/* progress containers */
	.ticker-progress {
		background: #222;
		width: 100%;
		height: 12px;
		border-radius: 2px;
		overflow: hidden;
	}

	.ticker-progress-bar {
		height: 100%;
		background: greenyellow;
		transition: width 0.1s linear;
	}
</style>
