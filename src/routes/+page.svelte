<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

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
		let AnimationFrameId: number;
		const AnimationStep = (CurrentTimestamp: number) => {
			const DeltaTimeSeconds = (CurrentTimestamp - LastFrameTimestamp) / 1000;
			LastFrameTimestamp = CurrentTimestamp;

			if (isPaused) {
				AnimationFrameId = requestAnimationFrame(AnimationStep);
				return;
			}

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

	// Mobile sidebar state
	let isMobileSidebarOpen = $state(false);

	// Footer expansion state
	let isFooterExpanded = $state(false);

	// Drawer expansion state
	let isDrawerExpanded = $state(false);

	// Mobile detection
	let isMobile = $state(false);

	onMount(() => {
		const handleResize = () => {
			isMobile = window.innerWidth <= 768;
			if (window.innerWidth > 768) {
				isMobileSidebarOpen = false;
			}
		};
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});
</script>

<div class="app-shell">
	<div class="layout-container" class:mobile-sidebar-open={isMobileSidebarOpen}>
		<div class="main-sidebar">
			<div class="sidebar-container">
				<!-- Sidebar: Header -->
				<div class="sidebar-header">
					<div class="sidebar-header-icon">🗃️</div>
					<div class="sidebar-header-text">
						<div class="sidebar-header-title">Pocket Universe Division: Idle</div>
						<div class="sidebar-header-subtitle">
							<i>A big picture game about the small things.</i>
						</div>
					</div>
				</div>

				<!-- Sidebar: Controls -->
				<div class="sidebar-controls">
					<button onclick={() => (isPaused = !isPaused)} class="button-small">
						{#if isPaused}
							<svg
								width="1em"
								height="1em"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								stroke-width="1"
								style="display: inline-block; margin-right: 0.5em;"
								><path
									d="M6.90588 4.53682C6.50592 4.2998 6 4.58808 6 5.05299V18.947C6 19.4119 6.50592 19.7002 6.90588 19.4632L18.629 12.5162C19.0211 12.2838 19.0211 11.7162 18.629 11.4838L6.90588 4.53682Z"
									fill="currentColor"
									stroke="currentColor"
									stroke-width="1"
									stroke-linecap="round"
									stroke-linejoin="round"
								></path></svg
							>
						{:else}
							<svg
								width="1em"
								height="1em"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								stroke-width="1"
								style="display: inline-block; margin-right: 0.5em;"
								><path
									d="M6 18.4V5.6C6 5.26863 6.26863 5 6.6 5H9.4C9.73137 5 10 5.26863 10 5.6V18.4C10 18.7314 9.73137 19 9.4 19H6.6C6.26863 19 6 18.7314 6 18.4Z"
									fill="currentColor"
									stroke="currentColor"
									stroke-width="1"
								></path><path
									d="M14 18.4V5.6C14 5.26863 14.2686 5 14.6 5H17.4C17.7314 5 18 5.26863 18 5.6V18.4C18 18.7314 17.7314 19 17.4 19H14.6C14.2686 19 14 18.7314 14 18.4Z"
									fill="currentColor"
									stroke="currentColor"
									stroke-width="1"
								></path></svg
							>
						{/if}
						{isPaused ? 'Play' : 'Pause'}
					</button>

					<button class="button-small" onclick={ToggleTheme}>
						{#if isDarkMode}
							<svg
								width="1em"
								height="1em"
								viewBox="0 0 24 24"
								stroke-width="1"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								color="currentColor"
								><path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M13.2319 2.28681C13.5409 2.38727 13.75 2.6752 13.75 3.00005V9.25005H19C19.2821 9.25005 19.5403 9.40834 19.6683 9.65972C19.7963 9.9111 19.7725 10.213 19.6066 10.4412L11.6066 21.4412C11.4155 21.7039 11.077 21.8137 10.7681 21.7133C10.4591 21.6128 10.25 21.3249 10.25 21.0001V14.7501H5C4.71791 14.7501 4.45967 14.5918 4.33167 14.3404C4.20366 14.089 4.22753 13.7871 4.39345 13.5589L12.3935 2.55892C12.5845 2.2962 12.923 2.18635 13.2319 2.28681Z"
									fill="currentColor"
								></path></svg
							>
						{:else}
							<svg
								width="1em"
								height="1em"
								viewBox="0 0 24 24"
								stroke-width="1"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								color="currentColor"
								><path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M13.2319 2.28681C13.5409 2.38727 13.75 2.6752 13.75 3.00005V9.25005H19C19.2821 9.25005 19.5403 9.40834 19.6683 9.65972C19.7963 9.9111 19.7725 10.213 19.6066 10.4412L11.6066 21.4412C11.4155 21.7039 11.077 21.8137 10.7681 21.7133C10.4591 21.6128 10.25 21.3249 10.25 21.0001V14.7501H5C4.71791 14.7501 4.45967 14.5918 4.33167 14.3404C4.20366 14.089 4.22753 13.7871 4.39345 13.5589L12.3935 2.55892C12.5845 2.2962 12.923 2.18635 13.2319 2.28681Z"
									fill="currentColor"
								></path></svg
							>
						{/if}
						{isDarkMode ? 'Light' : 'Dark'}
					</button>

					<button onclick={ResetGame} class="button-small">
						<svg
							width="1em"
							height="1em"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							color="currentColor"
							stroke-width="1"
							><path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM11.9877 7.75C9.70121 7.75 7.9471 9.28219 7.74541 11.0835C7.69932 11.4951 7.32825 11.7914 6.91661 11.7453C6.50497 11.6992 6.20863 11.3282 6.25472 10.9165C6.556 8.22597 9.07599 6.25 11.9877 6.25C13.6578 6.25 15.1863 6.8937 16.2503 7.94689V7.5C16.2503 7.08579 16.5861 6.75 17.0003 6.75C17.4145 6.75 17.7503 7.08579 17.7503 7.5V9.12222C17.7503 9.86781 17.1459 10.4722 16.4003 10.4722H14.4941C14.0799 10.4722 13.7441 10.1364 13.7441 9.72222C13.7441 9.30801 14.0799 8.97222 14.4941 8.97222H15.1523C14.3818 8.23175 13.2617 7.75 11.9877 7.75ZM12.0123 16.25C14.158 16.25 16.03 14.4222 16.2529 11.9331C16.2899 11.5205 16.6543 11.216 17.0669 11.253C17.4794 11.2899 17.7839 11.6544 17.747 12.0669C17.467 15.1926 15.0648 17.75 12.0123 17.75C10.3037 17.75 8.79345 16.943 7.74967 15.6877V16.4004C7.74967 16.8146 7.41389 17.1504 6.99967 17.1504C6.58546 17.1504 6.24967 16.8146 6.24967 16.4004V14.2226C6.24967 13.477 6.85409 12.8726 7.59967 12.8726H9.50586C9.92007 12.8726 10.2559 13.2084 10.2559 13.6226C10.2559 14.0368 9.92007 14.3726 9.50586 14.3726H8.63282C9.42384 15.5314 10.6601 16.25 12.0123 16.25Z"
								fill="currentColor"
							></path></svg
						>
						Reset
					</button>

					<button onclick={toggleAllSections} class="toggle-all-button button-small">
						{#if allCollapsed}
							<svg
								width="1em"
								height="1em"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								color="currentColor"
								stroke-width="1"
								><path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM13.0303 7.96967L16.5303 11.4697C16.8232 11.7626 16.8232 12.2374 16.5303 12.5303L13.0303 16.0303C12.7374 16.3232 12.2626 16.3232 11.9697 16.0303C11.6768 15.7374 11.6768 15.2626 11.9697 14.9697L14.1893 12.75H8C7.58579 12.75 7.25 12.4142 7.25 12C7.25 11.5858 7.58579 11.25 8 11.25H14.1893L11.9697 9.03033C11.6768 8.73744 11.6768 8.26256 11.9697 7.96967C12.2626 7.67678 12.7374 7.67678 13.0303 7.96967Z"
									fill="currentColor"
								></path></svg
							>
						{:else}
							<svg
								width="1em"
								height="1em"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								color="currentColor"
								stroke-width="1"
								><path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM16.0303 13.0303L12.5303 16.5303C12.2374 16.8232 11.7626 16.8232 11.4697 16.5303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L11.25 14.1893V8C11.25 7.58579 11.5858 7.25 12 7.25C12.4142 7.25 12.75 7.58579 12.75 8V14.1893L14.9697 11.9697C15.2626 11.6768 15.7374 11.6768 16.0303 11.9697C16.3232 12.2626 16.3232 12.7374 16.0303 13.0303Z"
									fill="currentColor"
								></path></svg
							>
						{/if}
						{allCollapsed ? 'Expand' : 'Expand'}
					</button>
				</div>

				<!-- Sidebar: Engine -->
				<div class="sidebar-engine">
					<button
						class="sidebar-engine-header"
						onclick={() => (isEngineCollapsed = !isEngineCollapsed)}
					>
						<div class="sidebar-engine-title">⚙️ Engine</div>

						<span class="collapse-arrow">
							{#if isEngineCollapsed}
								<svg
									width="1em"
									height="1em"
									viewBox="0 0 24 24"
									stroke-width="1"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									><path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M8.71299 18.6929C8.43273 18.5768 8.25 18.3033 8.25 18V5.99998C8.25 5.69663 8.43273 5.42315 8.71299 5.30707C8.99324 5.19098 9.31583 5.25515 9.53033 5.46965L15.5303 11.4696C15.8232 11.7625 15.8232 12.2374 15.5303 12.5303L9.53033 18.5303C9.31583 18.7448 8.99324 18.809 8.71299 18.6929Z"
										fill="currentColor"
									></path></svg
								>
							{:else}
								<svg
									width="1em"
									height="1em"
									viewBox="0 0 24 24"
									stroke-width="1"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									><path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M5.30711 8.71299C5.4232 8.43273 5.69668 8.25 6.00002 8.25H18C18.3034 8.25 18.5768 8.43273 18.6929 8.71299C18.809 8.99324 18.7449 9.31583 18.5304 9.53033L12.5304 15.5303C12.2375 15.8232 11.7626 15.8232 11.4697 15.5303L5.46969 9.53033C5.25519 9.31583 5.19103 8.99324 5.30711 8.71299Z"
										fill="currentColor"
									></path></svg
								>
							{/if}
						</span>
					</button>

					<div class="sidebar-engine-content" class:collapsed={isEngineCollapsed}>
						<div class="sidebar-engine-grid">
							<div class="sidebar-engine-item">
								<button class="sidebar-engine-item-name">Auto Extraction</button>
								<div class="sidebar-engine-item-border"></div>
								<button class="sidebar-engine-item-value progress-container">
									<div
										class="progress-bar"
										style="width: {(
											Math.min(1, TickElapsedSeconds / TickIntervalSeconds) * 100
										).toFixed(2)}%"
									></div>
									<div class="sidebar-engine-item-border"></div>
									<span class="progress-content">
										{Math.max(0, TickIntervalSeconds - TickElapsedSeconds).toFixed(4)}s
									</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Sidebar: Inventory -->
				<div class="sidebar-inventory">
					<button
						class="sidebar-inventory-header"
						onclick={() => (isInventoryCollapsed = !isInventoryCollapsed)}
					>
						<div class="sidebar-inventory-title">🎒 Inventory</div>
						<span class="collapse-arrow">
							{#if isInventoryCollapsed}
								<svg
									width="9px"
									height="9px"
									viewBox="0 0 24 24"
									stroke-width="1"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									><path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M8.71299 18.6929C8.43273 18.5768 8.25 18.3033 8.25 18V5.99998C8.25 5.69663 8.43273 5.42315 8.71299 5.30707C8.99324 5.19098 9.31583 5.25515 9.53033 5.46965L15.5303 11.4696C15.8232 11.7625 15.8232 12.2374 15.5303 12.5303L9.53033 18.5303C9.31583 18.7448 8.99324 18.809 8.71299 18.6929Z"
										fill="currentColor"
									></path></svg
								>
							{:else}
								<svg
									width="9px"
									height="9px"
									viewBox="0 0 24 24"
									stroke-width="1"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									><path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M5.30711 8.71299C5.4232 8.43273 5.69668 8.25 6.00002 8.25H18C18.3034 8.25 18.5768 8.43273 18.6929 8.71299C18.809 8.99324 18.7449 9.31583 18.5304 9.53033L12.5304 15.5303C12.2375 15.8232 11.7626 15.8232 11.4697 15.5303L5.46969 9.53033C5.25519 9.31583 5.19103 8.99324 5.30711 8.71299Z"
										fill="currentColor"
									></path></svg
								>
							{/if}
						</span>
					</button>

					<div class="sidebar-inventory-content" class:collapsed={isInventoryCollapsed}>
						<div class="sidebar-inventory-controls">
							<button
								class="button-small"
								onclick={() => {
									currentView = currentView === 'inventory' ? 'home' : 'inventory';
									closeRightSidebar();
									isDrawerExpanded = false;
								}}
							>
								{currentView === 'inventory' ? 'Close' : 'Open'}
							</button>
						</div>

						<div class="sidebar-inventory-grid">
							<div class="sidebar-inventory-item">
								<button
									class="sidebar-inventory-item-name"
									onclick={() => (isDrawerExpanded = !isDrawerExpanded)}>Data Shards</button
								>
								<div class="sidebar-inventory-item-border"></div>
								<button
									class="sidebar-inventory-item-value"
									onclick={() => (isDrawerExpanded = !isDrawerExpanded)}
								>
									{PlayerTotal.toFixed(4)}
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Sidebar: Equipment -->
				<div class="sidebar-equipment">
					<button
						class="sidebar-equipment-header"
						onclick={() => (isEquipmentCollapsed = !isEquipmentCollapsed)}
					>
						<div class="sidebar-equipment-title">🛠️ Equipment</div>
						<span class="collapse-arrow">
							{#if isEquipmentCollapsed}
								<svg
									width="9px"
									height="9px"
									viewBox="0 0 24 24"
									stroke-width="1"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									><path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M8.71299 18.6929C8.43273 18.5768 8.25 18.3033 8.25 18V5.99998C8.25 5.69663 8.43273 5.42315 8.71299 5.30707C8.99324 5.19098 9.31583 5.25515 9.53033 5.46965L15.5303 11.4696C15.8232 11.7625 15.8232 12.2374 15.5303 12.5303L9.53033 18.5303C9.31583 18.7448 8.99324 18.809 8.71299 18.6929Z"
										fill="currentColor"
									></path></svg
								>
							{:else}
								<svg
									width="9px"
									height="9px"
									viewBox="0 0 24 24"
									stroke-width="1"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									><path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M5.30711 8.71299C5.4232 8.43273 5.69668 8.25 6.00002 8.25H18C18.3034 8.25 18.5768 8.43273 18.6929 8.71299C18.809 8.99324 18.7449 9.31583 18.5304 9.53033L12.5304 15.5303C12.2375 15.8232 11.7626 15.8232 11.4697 15.5303L5.46969 9.53033C5.25519 9.31583 5.19103 8.99324 5.30711 8.71299Z"
										fill="currentColor"
									></path></svg
								>
							{/if}
						</span>
					</button>

					<div class="sidebar-equipment-content" class:collapsed={isEquipmentCollapsed}>
						<div class="sidebar-equipment-grid">
							<button class="sidebar-equipment-item progress-container" onclick={HandleClick}>
								<div class="progress-bar" style="width: {(ManualProgress * 100).toFixed(2)}%"></div>
								<span class="progress-content">
									Clicker (+{PerClickAmount})
								</span>
							</button>
							<button class="sidebar-equipment-item progress-container" disabled>
								<div
									class="progress-bar"
									style="width: {(
										Math.min(1, TickElapsedSeconds / TickIntervalSeconds) * 100
									).toFixed(2)}%"
								></div>
								<span class="progress-content">
									Auto (+{CoinsPerSecond.toFixed(2)}/s)
								</span>
							</button>
						</div>
					</div>
				</div>

				<!-- Sidebar: Upgrades -->
				<div class="sidebar-upgrades">
					<button
						class="sidebar-upgrades-header"
						onclick={() => (isUpgradesCollapsed = !isUpgradesCollapsed)}
					>
						<div class="sidebar-upgrades-title">⚙️ Upgrades</div>
						<span class="collapse-arrow">
							{#if isUpgradesCollapsed}
								<svg
									width="9px"
									height="9px"
									viewBox="0 0 24 24"
									stroke-width="1"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									><path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M8.71299 18.6929C8.43273 18.5768 8.25 18.3033 8.25 18V5.99998C8.25 5.69663 8.43273 5.42315 8.71299 5.30707C8.99324 5.19098 9.31583 5.25515 9.53033 5.46965L15.5303 11.4696C15.8232 11.7625 15.8232 12.2374 15.5303 12.5303L9.53033 18.5303C9.31583 18.7448 8.99324 18.809 8.71299 18.6929Z"
										fill="currentColor"
									></path></svg
								>
							{:else}
								<svg
									width="9px"
									height="9px"
									viewBox="0 0 24 24"
									stroke-width="1"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									><path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M5.30711 8.71299C5.4232 8.43273 5.69668 8.25 6.00002 8.25H18C18.3034 8.25 18.5768 8.43273 18.6929 8.71299C18.809 8.99324 18.7449 9.31583 18.5304 9.53033L12.5304 15.5303C12.2375 15.8232 11.7626 15.8232 11.4697 15.5303L5.46969 9.53033C5.25519 9.31583 5.19103 8.99324 5.30711 8.71299Z"
										fill="currentColor"
									></path></svg
								>
							{/if}
						</span>
					</button>

					<div class="sidebar-upgrades-content" class:collapsed={isUpgradesCollapsed}>
						<div class="sidebar-upgrades-grid">
							<button
								class="sidebar-upgrades-item progress-container {!CanBuyClickUpgrade ||
								ClickUpgradeProgress > 0
									? 'disabled'
									: ''}"
								onclick={BuyClickUpgrade}
							>
								<div
									class="progress-bar"
									style="width: {(ClickUpgradeProgress * 100).toFixed(2)}%"
								></div>
								<span class="progress-content">
									Clicker (Cost: {NextClickUpgradeCost})
								</span>
							</button>
							<button
								class="sidebar-upgrades-item progress-container {!CanBuyCPSUpgrade ||
								CPSUpgradeProgress > 0
									? 'disabled'
									: ''}"
								onclick={BuyCPSUpgrade}
							>
								<div
									class="progress-bar"
									style="width: {(CPSUpgradeProgress * 100).toFixed(2)}%"
								></div>
								<span class="progress-content">
									Auto (Cost: {CPSUpgradeCost()})
								</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Main Content Area -->
		<div class="main-content-area" class:mobile-sidebar-open={isMobileSidebarOpen}>
			<div class="main-content-area-header" class:right-sidebar-open={showRightSidebar}>
				<div class="main-content-area-header-title">
					<div class="main-content-area-header-emoji">
						{currentView === 'inventory' ? '🎒' : isMobile ? '🗃️' : '🎛️'}
					</div>
					<div class="main-content-area-header-name">
						{currentView === 'inventory'
							? 'Inventory'
							: isMobile
								? 'Pocket Universe Division: Idle'
								: 'Dashboard'}
					</div>
				</div>
			</div>

			<!-- Cabinet -->
			<div
				class="cabinet"
				onclick={(e) => {
					if (!(e.target as HTMLElement)?.closest('.drawer')) isDrawerExpanded = false;
				}}
				role={isDrawerExpanded ? 'button' : undefined}
			>
				<div class="cabinet-content-area" class:right-sidebar-open={showRightSidebar}>
					{#if isMobile && currentView === 'home'}
						<div class="view-title">
							<div class="emoji">🎛️</div>
							<div class="name">Dashboard</div>
						</div>
					{/if}

					<div class="cabinet-file">
						<div class="cabinet-file-header">
							<div class="cabinet-file-title">📔 Log</div>
						</div>
						<div class="cabinet-file-content">
							<p>Welcome to Pocket Universe Division: Idle!</p>
							<p>
								Click the large button below to extract Data Shards manually. You can also upgrade
								your extraction capabilities in the sidebar.
							</p>
							<p>
								Use Data Shards to purchase upgrades that enhance your extraction rate and
								efficiency. Activate boosts to temporarily increase your extraction speed.
							</p>
							<p>Happy extracting!</p>
						</div>
					</div>

					<div class="cabinet-file">
						<div class="cabinet-file-header">
							<div class="cabinet-file-title">📰 Recent Actions</div>
						</div>
						<div class="cabinet-file-content">
							<p>Here are your most recent actions:</p>
							{#if ActionHistory.length === 0}
								<p>No recent actions.</p>
							{:else}
								<ul>
									{#each ActionHistory as action}
										<li>{action}</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>

					<!-- Cabinet: Inventory -->
					<div class="cabinet-inventory" class:visible={currentView === 'inventory'}>
						<button
							onclick={() => {
								currentView = 'home';
								closeRightSidebar();
								isDrawerExpanded = false;
							}}>Back</button
						>
						<div class="cabinet-inventory-grid">
							<div class="cabinet-inventory-item">
								<button
									onclick={(e) => {
										e.stopPropagation();
										isDrawerExpanded = !isDrawerExpanded;
									}}
								>
									<div class="cabinet-inventory-detail">
										<div class="cabinet-inventory-detail-name">Data Shards</div>
										<div class="cabinet-inventory-detail-border"></div>
										<div class="cabinet-inventory-detail-quantity">
											{PlayerTotal.toFixed(4)}
										</div>
									</div>
								</button>
							</div>

							<div class="cabinet-inventory-item">
								<button
									onclick={(e) => {
										e.stopPropagation();
										isDrawerExpanded = !isDrawerExpanded;
									}}
								>
									<div class="cabinet-inventory-detail">
										<div class="cabinet-inventory-detail-name">Data Shards 2 (Cabinet Drawer)</div>
										<div class="cabinet-inventory-detail-border"></div>
										<div class="cabinet-inventory-detail-quantity">
											{PlayerTotal.toFixed(4)}
										</div>
									</div>
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Cabinet: Drawer -->
				<div class="cabinet-drawer" class:visible={isDrawerExpanded}>
					<div class="cabinet-drawer-toolbar">
						<button onclick={() => (isDrawerExpanded = false)} class="close" aria-label="Close"
							><svg
								width="1em"
								height="1em"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								color="currentColor"
								stroke-width="1"
								><path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM9.70164 8.64124C9.40875 8.34835 8.93388 8.34835 8.64098 8.64124C8.34809 8.93414 8.34809 9.40901 8.64098 9.7019L10.9391 12L8.64098 14.2981C8.34809 14.591 8.34809 15.0659 8.64098 15.3588C8.93388 15.6517 9.40875 15.6517 9.70164 15.3588L11.9997 13.0607L14.2978 15.3588C14.5907 15.6517 15.0656 15.6517 15.3585 15.3588C15.6514 15.0659 15.6514 14.591 15.3585 14.2981L13.0604 12L15.3585 9.7019C15.6514 9.40901 15.6514 8.93414 15.3585 8.64124C15.0656 8.34835 14.5907 8.34835 14.2978 8.64124L11.9997 10.9393L9.70164 8.64124Z"
									fill="currentColor"
								></path></svg
							></button
						>
					</div>

					<div class="cabinet-drawer-detail">
						<div class="cabinet-drawer-detail-container">
							<div class="cabinet-drawer-detail-container-name">Data Shards</div>
							<div class="cabinet-drawer-detail-container-border"></div>
							<div class="cabinet-drawer-detail-container-quantity">{PlayerTotal.toFixed(4)}</div>
						</div>

						<div class="cabinet-drawer-detail-description">
							Data Shards are the fundamental currency of the Pocket Universe Division. They
							represent discrete units of computational resources extracted from various sources.
							Use them to upgrade your extraction capabilities and enhance your efficiency.
						</div>
					</div>
				</div>
			</div>

			<div class="main-content-area-footer">
				<button
					class="main-content-area-footer-toolbar"
					onclick={() => (isFooterExpanded = !isFooterExpanded)}
					aria-label="Toggle footer expansion"
				>
					<svg
						width="1em"
						height="1em"
						stroke-width="1"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						><path
							d="M3 5H21"
							stroke="currentColor"
							stroke-width="1"
							stroke-linecap="round"
							stroke-linejoin="round"
						></path><path
							d="M3 12H21"
							stroke="currentColor"
							stroke-width="1"
							stroke-linecap="round"
							stroke-linejoin="round"
						></path><path
							d="M3 19H21"
							stroke="currentColor"
							stroke-width="1"
							stroke-linecap="round"
							stroke-linejoin="round"
						></path></svg
					>
				</button>
				<div class="main-content-area-footer-content">Footer.</div>
				<div class="main-content-area-footer-drawer" class:visible={isFooterExpanded}>
					<div class="main-content-area-footer-drawer-divider">
						<button onclick={BuyTickBoost} disabled={!CanBuyBoost}>Boost ({BoostCost})</button>
						<button onclick={BuyClickUpgrade} disabled={!CanBuyClickUpgrade}
							>Click Upgrade ({NextClickUpgradeCost})</button
						>
						<button onclick={BuyCPSUpgrade} disabled={!CanBuyCPSUpgrade}
							>CPS Upgrade ({CPSUpgradeCost()})</button
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
