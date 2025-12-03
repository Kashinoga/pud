<script lang="ts">
	let isDetailPanelVisible = false;
	let currentView: 'detail' | 'mail' = 'detail';
</script>

<div class="app-shell">
	<div class="side-bar">
		<div class="side-bar-header">
			<h2>Sidebar</h2>
		</div>
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

	<div class="content">
		<div class="top-bar">Top Bar</div>

		<div class="main-container">
			<div class="main-content">
				{#if currentView === 'detail'}
					<button on:click={() => (isDetailPanelVisible = !isDetailPanelVisible)}>
						Toggle Detail Panel
					</button>
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
				{/if}
				{#if currentView === 'mail'}
					<p>This is the mail view.</p>
				{/if}
			</div>
			<div class="detail-panel" class:detail-panel-visible={isDetailPanelVisible}>
				<button on:click={() => (isDetailPanelVisible = false)}>Close</button>
				<div>Detail Panel</div>
			</div>
		</div>
	</div>
</div>

<style>
	:root {
		--sidebar-width: 200px;
		--topbar-height: 40px;
		--detail-panel-width: 200px;
		--padding: 1rem;
	}

	:global(body) {
		margin: 0;
		padding: 0;
	}

	.app-shell {
		display: flex;
	}

	.content {
		display: flex;
		flex-direction: column;
		margin-left: var(--sidebar-width);
	}

	.top-bar {
		border-bottom: 1px solid black;
		padding: 1rem;
		background: white;
		height: var(--topbar-height);
		position: fixed;
		width: 100%;
		z-index: 900;
		display: flex;
		align-items: center;
	}

	.side-bar {
		width: var(--sidebar-width);
		border-right: 1px solid black;
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		z-index: 1000;
		background: white;
		overflow-y: auto;
	}

	.side-bar-header {
		padding: var(--padding);
		height: var(--topbar-height);
		position: sticky;
		background-color: white;
		/* width: 100%; */
		border-bottom: 1px solid black;
		top: 0;
		display: flex;
		align-items: center;
	}

	.side-bar-content {
		padding: var(--padding);
	}

	.detail-panel {
		width: 0;
		border-left: 1px solid black;
		padding: var(--padding);
		position: fixed;
		right: 0;
		height: 100%;
		background-color: white;
		margin-right: calc((var(--padding) + var(--padding)) * -1);
		border-left-width: 0;
	}

	.detail-panel.detail-panel-visible {
		width: var(--detail-panel-width);
		border-left-width: 1px;
	}

	.main-container {
		display: flex;
		flex-direction: row;
		flex: 1;
		overflow-y: auto;
		margin-top: calc(var(--topbar-height) + var(--padding) + var(--padding));
	}

	.main-content {
		padding: var(--padding);
	}
</style>
