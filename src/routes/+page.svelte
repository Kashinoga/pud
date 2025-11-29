<script lang="ts">
	import { browser } from '$app/environment';

	const savedData = browser ? JSON.parse(localStorage.getItem('save') || '{}') : {};

	// Local state with loaded values
	let PlayerTotal = $state(savedData.PlayerTotal ?? savedData.total ?? 0);
	let PerClickAmount = $state(savedData.PerClickAmount ?? savedData.perClick ?? 1);
	let CoinsPerSecond = $state(savedData.CoinsPerSecond ?? savedData.cps ?? 0);
	let TickElapsedSeconds = $state(savedData.TickElapsedSeconds ?? savedData.tickElapsed ?? 0);
	let ManualProgress = $state(savedData.ManualProgress ?? 0);
	let PendingManualClicks = $state(savedData.PendingManualClicks ?? 0);
	let BoostTimeRemaining = $state(savedData.BoostTimeRemaining ?? 0);
	let BoostMultiplier = $state(savedData.BoostMultiplier ?? 1);
	let ActionHistory = $state<string[]>(savedData.ActionHistory ?? []);
	let isDarkMode = $state(savedData.isDarkMode ?? false);
	let ClickUpgradeProgress = $state(savedData.ClickUpgradeProgress ?? 0);
	let CPSUpgradeProgress = $state(savedData.CPSUpgradeProgress ?? 0);
	let PendingCPSIncrement = $state(savedData.PendingCPSIncrement ?? 0);
	let isPaused = $state(savedData.isPaused ?? false); // Add pause state

	// Action history
	const MaxHistoryItems = 10;

	function AddToHistory(Action: string) {
		ActionHistory = [Action, ...ActionHistory].slice(0, MaxHistoryItems);
	}

	// Tick state for discrete CPS application
	const TickIntervalSeconds = 1; // seconds per tick

	// Manual extraction state
	const ManualExtractionTime = 0.2; // seconds to complete manual extraction

	// Boost state
	const BoostCost = 10;
	const BoostDurationSeconds = 10;
	const BoostSpeedMultiplier = 2; // 2x speed

	// Upgrade progress states
	const ClickUpgradeTime = 1; // seconds to complete click upgrade
	const CPSUpgradeTime = 2; // seconds to complete CPS upgrade

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
		if (isPaused) return; // Skip if paused

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
				PendingCPSIncrement,
				isPaused
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
			isPaused = s.isPaused ?? false;
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

	// Add state for right sidebar
	let showRightSidebar = $state(false);
	let selectedItem = $state<string | null>(null);

	function openItemDetails(item: string) {
		selectedItem = item;
		showRightSidebar = true;
	}

	function closeRightSidebar() {
		showRightSidebar = false;
		selectedItem = null;
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
				<button onclick={() => (isPaused = !isPaused)} class="button-small">
					{isPaused ? '▶ Play' : '⏸️ Pause'}
				</button>
				<button class="button-small" onclick={ToggleTheme}
					>{isDarkMode ? '☀️ Light' : '🌙 Dark'}</button
				>
				<button onclick={ResetGame} class="button-small">🔄 Reset</button>
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
							onclick={() => {
								currentView = currentView === 'inventory' ? 'home' : 'inventory';
								closeRightSidebar();
							}}
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
			<div class="header">
				<div class="content" class:right-sidebar-open={showRightSidebar}>
					<div class="title">
						<p>{currentView === 'inventory' ? 'Inventory' : 'Header.'}</p>
					</div>
					<div class="toolbar"></div>
				</div>
			</div>

			<div class="content">
				<div class="flex">
					{#if currentView === 'home'}
						<div>
							<p>Main.</p>
						</div>
					{:else if currentView === 'inventory'}
						<div class="inventory">
							<button
								onclick={() => {
									currentView = 'home';
									closeRightSidebar();
								}}>Back</button
							>
							<div class="grid">
								<div class="item">
									<button
										class="toggle"
										class:selected={selectedItem === 'dataShards'}
										onclick={() => {
											if (selectedItem === 'dataShards') {
												closeRightSidebar();
											} else {
												openItemDetails('dataShards');
											}
										}}
									>
										<div class="detail">
											<div class="name">Data Shards</div>
											<div class="border"></div>
											<div class="quantity">
												{PlayerTotal.toFixed(4)}
											</div>
										</div>
									</button>
									{#if isDataShardsOpen}
										<div class="content">
											<h3>Recent Actions</h3>
											<ul>
												{#each ActionHistory as action}
													<li>{action}</li>
												{/each}
											</ul>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/if}
				</div>

				{#if showRightSidebar}
					<div class="sidebar">
						<button onclick={closeRightSidebar} class="close">✕</button>
						{#if selectedItem === 'dataShards'}
							<div class="detail">
								<div class="container">
									<div class="name">Data Shards</div>
									<div class="border"></div>
									<div class="quantity">{PlayerTotal.toFixed(4)}</div>
								</div>
								<div class="description">
									Data Shards are the fundamental currency of the Pocket Universe Division. They
									represent discrete units of computational resources extracted from various
									sources. Use them to upgrade your extraction capabilities and enhance your
									efficiency.
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="footer">
				<p>Footer.</p>
			</div>
		</div>
	</div>
</div>
