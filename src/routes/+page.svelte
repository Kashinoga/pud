<script lang="ts">
	import { goto } from '$app/navigation';

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
	const ManualExtractionTime = 0.2; // seconds to complete manual extraction
	let ManualProgress = $state(0); // 0 to 1, progress toward manual extraction
	let PendingManualClicks = $state(0); // number of manual clicks pending extraction

	// Boost state
	let BoostMultiplier = $state(1); // 1x = normal speed
	let BoostTimeRemaining = $state(0); // seconds left on current boost
	const BoostCost = 10;
	const BoostDurationSeconds = 10;
	const BoostSpeedMultiplier = 2; // 2x speed

	// Upgrade progress states
	const ClickUpgradeTime = 1; // seconds to complete click upgrade
	const CPSUpgradeTime = 2; // seconds to complete CPS upgrade
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

	// Modal state
	let showDataShardsModal = $state(false);

	// Add state for accordion toggle
	let isDataShardsOpen = $state(false);

	// main view
	let currentView = $state('home'); // 'home' or 'inventory'
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
				<button class="button-small" onclick={ToggleTheme}
					>{isDarkMode ? '☀️ Light' : '🌙 Dark'}</button
				>
				<button onclick={toggleAllSections} class="toggle-all-button button-small">
					{allCollapsed ? '▼ Expand All' : '▶ Collapse All'}
				</button>
			</div>

			<div class="engine">
				<button class="header" onclick={() => (isEngineCollapsed = !isEngineCollapsed)}>
					<div class="title">⚙️ Engine</div>
					<span class="collapse-arrow">{isEngineCollapsed ? '▶' : '▼'}</span>
				</button>

				{#if !isEngineCollapsed}
					<div class="content">
						<div class="grid">
							<div class="item">
								<button class="name">Auto Extraction</button>
								<div class="border"></div>
								<button class="value progress">
									<div
										class="bar"
										style="width: {(
											Math.min(1, TickElapsedSeconds / TickIntervalSeconds) * 100
										).toFixed(2)}%"
									></div>
									<div class="border"></div>
									<span class="progress-content">
										{Math.max(0, TickIntervalSeconds - TickElapsedSeconds).toFixed(4)}s
									</span>
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="inventory">
				<button class="header" onclick={() => (isInventoryCollapsed = !isInventoryCollapsed)}>
					<div class="title">🎒 Inventory</div>
					<span class="collapse-arrow">{isInventoryCollapsed ? '▶' : '▼'}</span>
				</button>

				{#if !isInventoryCollapsed}
					<div class="inventory-controls">
						<button
							class="button-small"
							onclick={() => (currentView = currentView === 'inventory' ? 'home' : 'inventory')}
						>
							{currentView === 'inventory' ? 'Close' : 'Open'}
						</button>
					</div>

					<div class="content">
						<div class="sgrid">
							<div class="item">
								<button class="name" onclick={() => (showDataShardsModal = true)}
									>Data Shards</button
								>
								<div class="border"></div>
								<button class="value">
									{PlayerTotal.toFixed(4)}
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="equipment">
				<button class="header" onclick={() => (isEquipmentCollapsed = !isEquipmentCollapsed)}>
					<div class="title">🛠️ Equipment</div>
					<span class="collapse-arrow">{isEquipmentCollapsed ? '▶' : '▼'}</span>
				</button>
				{#if !isEquipmentCollapsed}
					<div class="content">
						<div class="grid">
							<button class="item progress" onclick={HandleClick}>
								<!-- progress fill -->
								<div class="bar" style="width: {(ManualProgress * 100).toFixed(2)}%"></div>
								<!-- visible content on top -->
								<span class="progress-content">
									Clicker (+{PerClickAmount})
								</span>
							</button>
							<button class="item progress" disabled>
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

			<div class="upgrades">
				<button class="header" onclick={() => (isUpgradesCollapsed = !isUpgradesCollapsed)}>
					<div class="title">⚙️ Upgrades</div>
					<span class="collapse-arrow">{isUpgradesCollapsed ? '▶' : '▼'}</span>
				</button>
				{#if !isUpgradesCollapsed}
					<div class="content">
						<div class="grid">
							<button
								class="item progress {!CanBuyClickUpgrade || ClickUpgradeProgress > 0
									? 'disabled'
									: ''}"
								onclick={BuyClickUpgrade}
							>
								<div class="bar" style="width: {(ClickUpgradeProgress * 100).toFixed(2)}%"></div>
								<span class="progress-content">
									Clicker (Cost: {NextClickUpgradeCost})
								</span>
							</button>
							<button
								class="item progress {!CanBuyCPSUpgrade || CPSUpgradeProgress > 0
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
					<div class="header-title">
						<p>{currentView === 'inventory' ? 'Inventory' : 'Header.'}</p>
					</div>
					<div class="header-toolbar"></div>
				</div>
			</div>
			<div class="main-content">
				{#if currentView === 'home'}
					<div>
						<p>Main.</p>
					</div>
				{:else if currentView === 'inventory'}
					<div class="inventory-page">
						<button onclick={() => (currentView = 'home')}>Back</button>
						<div class="inventory-grid">
							<div class="inventory-item">
								<!-- <button class="inventory-item-name" onclick={() => (showDataShardsModal = true)}
									>Data Shards</button
								> -->
								<button
									class="inventory-item-name accordion-toggle"
									onclick={() => (isDataShardsOpen = !isDataShardsOpen)}
								>
									{PlayerTotal} Data Shards
									<span class="collapse-arrow">{isDataShardsOpen ? '▼' : '▶'}</span>
								</button>
								{#if isDataShardsOpen}
									<div class="accordion-content">
										<h3>Recent Actions</h3>
										<ul>
											{#each ActionHistory as action}
												<li>{action}</li>
											{/each}
										</ul>
									</div>
								{/if}

								<!-- <div class="inventory-item-border"></div>

								<button class="inventory-item-value">
									{PlayerTotal.toFixed(4)}
								</button> -->
							</div>
						</div>
					</div>
				{/if}
			</div>
			<div class="main-footer">
				<p>Footer.</p>
			</div>
		</div>
	</div>

	<!-- {#if showDataShardsModal}
		<div
			class="modal-overlay"
			role="button"
			tabindex="0"
			onclick={(e) => {
				if (e.target === e.currentTarget) showDataShardsModal = false;
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					showDataShardsModal = false;
				}
			}}
		>
			<div class="modal-content" role="dialog">
				<h2>Data Shards</h2>
				<p>You have {PlayerTotal.toFixed(4)} Data Shards.</p>
				<div class="modal-history">
					<h3>Recent Actions</h3>
					<ul>
						{#each ActionHistory as action}
							<li>{action}</li>
						{/each}
					</ul>
				</div>
				<button onclick={() => (showDataShardsModal = false)}>Close</button>
			</div>
		</div>
	{/if} -->
</div>
