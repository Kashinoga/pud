<script lang="ts">
	// Local state
	let PlayerTotal = $state(0);
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
	const CPSUpgradeCost = () => Math.floor(50 * Math.pow(1.15, CoinsPerSecond * 10));
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
			AddToHistory(`Bought Click Upgrade +1 (Level ${PerClickAmount})`);
		}
	}

	function BuyCPSUpgrade() {
		const cost = Math.floor(50 * Math.pow(1.15, CoinsPerSecond * 10));
		if (PlayerTotal >= cost) {
			PlayerTotal -= cost;
			CoinsPerSecond += 1;
			AddToHistory(`Bought CPS Upgrade +1 (Level ${CoinsPerSecond.toFixed(0)})`);
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

<h1>Pocket Universe Division: Idle</h1>
<p>Total: {PlayerTotal.toFixed(0)}</p>
<p>CPS: {CoinsPerSecond.toFixed(2)}</p>
{#if BoostTimeRemaining > 0}
	<p style="color: #ff9800; font-weight: bold;">
		⚡ Boost Active: {BoostTimeRemaining.toFixed(1)}s ({(BoostMultiplier * 100).toFixed(0)}% speed)
	</p>
{/if}

<div class="section stats-section">
	<h3>Current Levels</h3>
	<div class="stats-grid">
		<div class="stat-item">
			<span class="stat-label">Click Power:</span>
			<span class="stat-value">+{PerClickAmount}</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">CPS Level:</span>
			<span class="stat-value">+{CoinsPerSecond}/sec</span>
		</div>
	</div>
</div>

<button onclick={ResetGame} style="margin-left: 2em; background: #f44336; color: white;">
	Reset Game
</button>

<div class="section section--small">
	<label for="tick-progress"
		>Time to next CPS tick: {Math.max(0, TickIntervalSeconds - TickElapsedSeconds).toFixed(
			2
		)}s</label
	>
	<div id="tick-progress" class="progress progress--small">
		<div
			class="bar bar--tick"
			style="width: {(Math.min(1, TickElapsedSeconds / TickIntervalSeconds) * 100).toFixed(2)}%"
		></div>
	</div>
</div>

<div class="section">
	<label for="click-upgrade-progress">Progress to next click upgrade:</label>
	<button
		id="click-upgrade-progress"
		class="progress progress--large"
		onclick={BuyClickUpgrade}
		disabled={!CanBuyClickUpgrade}
		aria-label="Buy Click Upgrade (Cost: {NextClickUpgradeCost})"
	>
		<div
			class="bar bar--click"
			style="width: {Math.min(100, (PlayerTotal / NextClickUpgradeCost) * 100)}%"
		></div>
	</button>
</div>

<div class="section">
	<label for="cps-upgrade-progress">Progress to next CPS upgrade:</label>
	<button
		id="cps-upgrade-progress"
		class="progress progress--large"
		onclick={BuyCPSUpgrade}
		disabled={!CanBuyCPSUpgrade}
		aria-label="Buy CPS Upgrade (Cost: {CPSUpgradeCost()})"
	>
		<div
			class="bar bar--cps"
			style="width: {Math.min(100, (PlayerTotal / CPSUpgradeCost()) * 100)}%"
		></div>
	</button>
</div>

<div class="button-grid">
	<button onclick={HandleClick}>Click! +{PerClickAmount}</button>
	<button onclick={BuyClickUpgrade} disabled={!CanBuyClickUpgrade}>
		Buy click power (Cost: {NextClickUpgradeCost})
	</button>
	<button onclick={BuyCPSUpgrade} disabled={!CanBuyCPSUpgrade}>
		Buy CPS (Cost: {CPSUpgradeCost()})
	</button>
	<button onclick={BuyTickBoost} disabled={!CanBuyBoost}>
		Buy Tick Boost (Cost: {BoostCost})
	</button>
	<button onclick={ResetGame} style="background: #f44336; color: white;"> Reset </button>
</div>

<div class="section history-section">
	<h3>Recent Actions</h3>
	<ul class="action-history">
		{#each ActionHistory as action (action)}
			<li>{action}</li>
		{/each}
	</ul>
</div>

<style>
	/* Global */
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #fafafa;
	}

	:global(#svelte) {
		min-height: 100vh;
		padding: 1rem;
	}

	h1 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
	}

	/* layout */
	.section {
		margin: 1em 0;
	}
	.section--small {
		margin: 0.5em 0;
	}

	/* progress containers */
	.progress {
		border-radius: 4px;
		overflow: hidden;
	}
	.progress--large {
		background: #eee;
		width: 100%;
		max-width: 300px;
		height: 24px;
	}
	.progress--small {
		background: #222;
		width: 100%;
		max-width: 200px;
		height: 12px;
		margin-top: 4px;
	}

	/* bars */
	.bar {
		height: 100%;
		transition: width 0.2s ease;
	}

	.bar--tick {
		background: linear-gradient(90deg, #ff9800, #ffc107);
		transition: width 0.05s linear;
	}
	.bar--click {
		background: linear-gradient(90deg, #4caf50, #81c784);
	}
	.bar--cps {
		background: linear-gradient(90deg, #2196f3, #64b5f6);
	}

	/* buttons */
	label {
		display: block;
		font-size: 0.9rem;
		margin-bottom: 4px;
	}

	button {
		margin-right: 0.5rem;
		margin-top: 0.5rem;
		padding: 0.75rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: #fff;
		cursor: pointer;
		font-size: 1rem;
	}

	button:hover:not(:disabled) {
		background: #f0f0f0;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		pointer-events: none;
	}

	button.progress {
		border: 1px solid #ccc;
		padding: 0;
		cursor: pointer;
		font-size: inherit;
	}
	button.progress:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		pointer-events: none;
	}
	button.progress:not(:disabled):hover {
		border-color: #999;
	}

	/* button grid */
	.button-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1em 0;
	}

	.button-grid button {
		flex: 1;
		min-width: 120px;
		margin: 0;
	}

	/* history */
	.history-section {
		margin-top: 2em;
		padding: 1em;
		background: #f5f5f5;
		border-radius: 8px;
	}

	.history-section h3 {
		margin: 0 0 0.5em 0;
		font-size: 1rem;
	}

	.action-history {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.85rem;
	}

	.action-history li {
		padding: 0.25em 0;
		color: #666;
		border-bottom: 1px solid #ddd;
	}

	.action-history li:last-child {
		border-bottom: none;
	}

	/* stats section */
	.stats-section {
		background: #f0f8ff;
		padding: 1em;
		border-radius: 8px;
		margin: 1em 0;
	}
	.stats-section h3 {
		margin: 0 0 0.5em 0;
		font-size: 1rem;
	}
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1em;
	}
	.stat-item {
		background: #fff;
		padding: 0.5em;
		border-radius: 4px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	.stat-label {
		display: block;
		font-size: 0.9rem;
		margin-bottom: 0.2em;
		color: #333;
	}
	.stat-value {
		font-size: 1.2rem;
		font-weight: bold;
		color: #111;
	}

	/* tablet & desktop */
	@media (min-width: 640px) {
		:global(#svelte) {
			padding: 2rem;
			max-width: 1200px;
			margin: 0 auto;
		}

		h1 {
			font-size: 2rem;
		}

		.button-grid button {
			flex: 0 1 auto;
			min-width: auto;
		}
	}
</style>
