<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let isDetailPanelVisible = false;
	let currentView: 'detail' | 'mail' = 'detail';
	let isSidebarCollapsed = false;
	let isMobile: boolean;

	function toggleDarkMode() {
		document.documentElement.classList.toggle('dark-mode');
	}

	onMount(() => {
		const updateWidth = () => (isMobile = window.innerWidth <= 768);
		updateWidth();
		window.addEventListener('resize', updateWidth);
		return () => window.removeEventListener('resize', updateWidth);
	});
</script>

<div class="app-shell">
	<div
		class="side-bar"
		class:side-bar-collapsed={isSidebarCollapsed}
		class:side-bar-mobile={isMobile}
		class:side-bar-desktop={!isMobile}
	>
		{#if isMobile}
			<button
				class="side-bar-header"
				type="button"
				aria-expanded={!isSidebarCollapsed}
				on:click={() => (isSidebarCollapsed = !isSidebarCollapsed)}
			>
				<div class="side-bar-header-title">Intergalactic Park Ranger</div>
			</button>
		{:else}
			<div class="side-bar-header">
				<div class="side-bar-header-title">Intergalactic Park Ranger</div>
			</div>
		{/if}

		<div class="side-bar-content">
			<div class="side-bar-buttons">
				<button on:click={() => (currentView = 'detail')}> Detail View </button>
				<button on:click={() => (currentView = 'mail')}> Mail View </button>
			</div>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
				labore et dolore magna aliqua.
			</p>
			<p>
				Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
				commodo consequat.
			</p>
			<p>
				Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
				pariatur.
			</p>
			<p>
				Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
				anim id est laborum.
			</p>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
				labore et dolore magna aliqua.
			</p>
			<p>
				Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
				commodo consequat.
			</p>
			<p>
				Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
				pariatur.
			</p>
			<p>
				Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
				anim id est laborum.
			</p>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
				labore et dolore magna aliqua.
			</p>
			<p>
				Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
				commodo consequat.
			</p>
			<p>
				Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
				pariatur.
			</p>
			<p>
				Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
				anim id est laborum.
			</p>
		</div>
	</div>

	<div class="content" class:side-bar-collapsed={isSidebarCollapsed} class:is-mobile={isMobile}>
		<div
			class="top-bar"
			class:side-bar-collapsed={isSidebarCollapsed}
			class:top-bar-mobile={isMobile}
		>
			<div class="top-bar-title">Galactic Management Console</div>
			<div class="top-bar-buttons">
				<button on:click={toggleDarkMode}>Theme</button>
				<button on:click={() => (isSidebarCollapsed = !isSidebarCollapsed)}>Sidebar</button>
			</div>
		</div>

		<div class="main-container" class:side-bar-mobile={isMobile}>
			<div class="main-content" class:main-content-mobile={isMobile}>
				{#if currentView === 'detail'}
					<div transition:fade={{ duration: 200 }}>
						<button on:click={() => (isDetailPanelVisible = !isDetailPanelVisible)}>
							Toggle Detail Panel
						</button>
						<p>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
							incididunt ut labore et dolore magna aliqua.
						</p>
						<p>
							Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
							ea commodo consequat.
						</p>
						<p>
							Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
							nulla pariatur.
						</p>
						<p>
							Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
							mollit anim id est laborum.
						</p>
						<p>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
							incididunt ut labore et dolore magna aliqua.
						</p>
						<p>
							Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
							ea commodo consequat.
						</p>
						<p>
							Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
							nulla pariatur.
						</p>
						<p>
							Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
							mollit anim id est laborum.
						</p>
						<p>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
							incididunt ut labore et dolore magna aliqua.
						</p>
						<p>
							Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
							ea commodo consequat.
						</p>
						<p>
							Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
							nulla pariatur.
						</p>
						<p>
							Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
							mollit anim id est laborum.
						</p>
					</div>
				{/if}
				{#if currentView === 'mail'}
					<div transition:fade={{ duration: 200 }}>
						<p>This is the mail view.</p>
					</div>
				{/if}
			</div>

			<div
				class="detail-panel"
				class:detail-panel-visible={isDetailPanelVisible}
				class:detail-panel-mobile={isMobile}
			>
				<button on:click={() => (isDetailPanelVisible = false)}>Close</button>
				<div>Detail Panel</div>
				<div>
					<p>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
						incididunt ut labore et dolore magna aliqua.
					</p>
					<p>
						Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
						commodo consequat.
					</p>
					<p>
						Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
						nulla pariatur.
					</p>
					<p>
						Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
						mollit anim id est laborum.
					</p>
					<p>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
						incididunt ut labore et dolore magna aliqua.
					</p>
					<p>
						Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
						commodo consequat.
					</p>
					<p>
						Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
						nulla pariatur.
					</p>
					<p>
						Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
						mollit anim id est laborum.
					</p>
					<p>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
						incididunt ut labore et dolore magna aliqua.
					</p>
					<p>
						Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
						commodo consequat.
					</p>
					<p>
						Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
						nulla pariatur.
					</p>
					<p>
						Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
						mollit anim id est laborum.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
