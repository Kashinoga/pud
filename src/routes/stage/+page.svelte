<script lang="ts">
	import { fade, slide, fly } from 'svelte/transition';
	let selectedItem: { id: number; name: string; details: string } | null = $state(null);
	let isBottomBarExpanded = $state(false);
	let isSidebarCollapsed = $state(false);
	let currentView = $state('home');
	let detailsPosition = $state('left');
	let bottomBarHeight = $derived('2rem');
	let sidebarWidth = $derived(isSidebarCollapsed ? '40px' : '250px');

	const items = [
		{ id: 1, name: 'Item 1', details: 'Details for Item 1' },
		{ id: 2, name: 'Item 2', details: 'Details for Item 2' },
		{ id: 3, name: 'Item 3', details: 'Details for Item 3' }
	];

	function selectItem(item: { id: number; name: string; details: string }) {
		if (selectedItem && selectedItem.id === item.id) {
			selectedItem = null;
		} else {
			selectedItem = item;
		}
	}

	function closeDetails() {
		selectedItem = null;
	}

	function setView(view: string) {
		currentView = view;
		selectedItem = null; // close details when switching views
	}
</script>

<div class="container">
	<div class="top-bar">
		<button onclick={() => (isSidebarCollapsed = !isSidebarCollapsed)}>
			{isSidebarCollapsed ? '▶' : '◀'}
		</button>
	</div>
	<div class="main-area">
		<div class="sidebar" style="width: {sidebarWidth}; transition: width 0.3s ease;">
			{#if !isSidebarCollapsed}
				<div class="sidebar-content">
					<div id="sidebar-title">Intergalactic Park Ranger</div>

					<div class="view-buttons">
						<button onclick={() => setView('home')} class="view-btn">Home</button>
						<button onclick={() => setView('emails')} class="view-btn">Emails</button>
						<button onclick={() => setView('attachments')} class="view-btn">Attachments</button>
						<button onclick={() => setView('inventory')} class="view-btn">Inventory</button>
					</div>

					<div class="quick-access">
						<div id="sidebar-quick-access">Quick Access</div>
						<ul>
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							{#each items as item}
								<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
								<li
									onclick={() => {
										detailsPosition = 'left';
										selectItem(item);
									}}
									class="item"
								>
									{item.name}
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}
		</div>
		<div class="right-section" style="--bottom-bar-height: {bottomBarHeight}">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="content" onclick={() => (selectedItem = null)}>
				{#if currentView === 'home'}
					<h1>Content Area</h1>

					<p>This is the main content area.</p>
					<p>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
						incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
						exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
						dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
						Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
						mollit anim id est laborum.
					</p>
					<p>
						Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
						laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
						architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas
						sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione
						voluptatem sequi nesciunt.
					</p>
					<p>
						Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci
						velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam
						aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam
						corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel
						eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur,
						vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?
					</p>
					<p>
						At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium
						voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint
						occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt
						mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et
						expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque
						nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda
						est, omnis dolor repellendus.
					</p>
					<p>
						Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe
						eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum
						rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias
						consequatur aut perferendis doloribus asperiores repellat.
					</p>
					<p>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent
						libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum
						imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper
						porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad
						litora torquent per conubia nostra, per inceptos himenaeos.
					</p>
					<p>
						Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor.
						Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed
						convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus,
						iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia
						aliquet. Mauris ipsum.
					</p>
					<p>
						Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat
						condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra,
						per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor
						neque adipiscing diam, a cursus ipsum ante quis turpis. Nulla facilisi. Ut fringilla.
						Suspendisse potenti. Nunc feugiat mi a tellus consequat imperdiet. Vestibulum sapien.
						Proin quam. Etiam ultrices.
					</p>
					<p>
						Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus
						magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, at interdum
						magna augue eget diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
						posuere cubilia Curae; Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam.
						In vel mi sit amet augue congue elementum.
					</p>
					<p>
						Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc, viverra nec, blandit
						vel, egestas et, augue. Vestibulum tincidunt malesuada tellus. Ut ultrices ultrices
						enim. Curabitur sit amet mauris. Morbi in dui quis est pulvinar ullamcorper. Nulla
						facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor.
						Integer id quam. Morbi mi.
					</p>
					{#if selectedItem}
						<p>Selected: {selectedItem.name}</p>
					{/if}
				{/if}

				{#if currentView === 'emails'}
					<h1>Emails</h1>
					<p>Email content here...</p>
				{/if}

				{#if currentView === 'attachments'}
					<h1>Attachments</h1>
					<p>Attachment content here...</p>
				{/if}

				{#if currentView === 'inventory'}
					<h1>Inventory</h1>
					<div class="inventory-grid">
						{#each items as item}
							<div
								class="inventory-item"
								onclick={(e) => {
									e.stopPropagation();
									detailsPosition = 'right';
									selectItem(item);
								}}
							>
								<h4>{item.name}</h4>
								<p>{item.details}</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="bottom-bar">
				<button
					id="bottom-bar-expander"
					onclick={() => (isBottomBarExpanded = !isBottomBarExpanded)}
					class="button"
				>
					{isBottomBarExpanded ? 'Collapse' : 'Expand'}
				</button>
				<div class="top-row">
					<div class="view-buttons">
						<button onclick={() => setView('home')} class="view-btn">Home</button>
						<button onclick={() => setView('emails')} class="view-btn">Emails</button>
						<button onclick={() => setView('attachments')} class="view-btn">Attachments</button>
						<button onclick={() => setView('inventory')} class="view-btn">Inventory</button>
					</div>
				</div>
			</div>

			{#if isBottomBarExpanded}
				<div class="bottom-bar-overlay" transition:slide>
					<p>Bottom Bar - Status or Controls</p>
					<div class="expanded-content">
						<p>Items:</p>
						<ul>
							<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
							{#each items as item}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<li
									onclick={() => {
										detailsPosition = 'left';
										selectItem(item);
									}}
									class="item"
								>
									{item.name}
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}
		</div>
	</div>

	{#if selectedItem}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="details {detailsPosition === 'right' ? 'right' : ''}"
			style="right: 0;"
			transition:fly={{ x: detailsPosition === 'left' ? -250 : 250, duration: 300 }}
			onclick={(e) => e.stopPropagation()}
		>
			<h2>Details</h2>
			<p>{selectedItem.details}</p>
			<button onclick={closeDetails}>Close</button>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}

	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		position: relative;
	}

	.top-bar {
		background-color: #ddd;
		display: flex;
		align-items: center;
	}

	.main-area {
		flex: 1;
		display: flex;
	}

	.sidebar {
		height: 100%;
		background-color: #f0f0f0;
	}

	.sidebar ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.view-buttons {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 10px;
		padding: 1rem;
		padding-left: 0;
	}

	.sidebar .quick-access h3 {
		margin-top: 20px;
		margin-bottom: 10px;
		font-size: 16px;
		color: #666;
	}

	.inventory-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 15px;
		margin-top: 20px;
	}

	.inventory-item {
		border: 1px solid #ccc;
		padding: 15px;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.inventory-item:hover {
		background-color: #f9f9f9;
	}

	.inventory-item h4 {
		margin: 0 0 10px 0;
		font-size: 18px;
		color: #333;
	}

	.inventory-item p {
		margin: 0;
		font-size: 14px;
		color: #666;
	}

	.right-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.content {
		flex: 1;
		padding: 20px;
		padding-bottom: 2rem;
		box-sizing: border-box;
		overflow-y: auto;
	}

	.details {
		position: absolute;
		left: 250px;
		top: 0;
		width: 250px;
		height: 100vh;
		background-color: #e0e0e0;
		padding: 20px;
		box-sizing: border-box;
		z-index: 10;
	}

	.details.right {
		left: auto;
		right: 0;
	}

	.item {
		cursor: pointer;
		padding: 5px;
		margin: 5px 0;
		background-color: #ddd;
		border-radius: 4px;
	}

	.item:hover {
		background-color: #ccc;
	}

	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 2rem;
		background-color: #ddd;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		z-index: 20;
	}

	.bottom-bar-overlay {
		position: fixed;
		bottom: 2rem;
		left: 0;
		right: 0;
		background-color: #ddd;
		padding: 10px;
		box-sizing: border-box;
		z-index: 25;
		max-height: 50vh;
		overflow-y: auto;
	}

	#bottom-bar-expander {
		height: 2rem;
		width: 100%;
		padding: 0;
		border: none;
		background-color: #ddd;
		color: inherit;
		cursor: pointer;
		line-height: 2rem;
		text-align: center;
		display: block;
	}

	.expanded-content {
		margin-top: 10px;
	}

	.bottom-bar ul {
		list-style: none;
	}

	.bottom-bar .item {
		cursor: pointer;
		padding: 5px;
		margin: 5px 0;
		background-color: #ddd;
		border-radius: 4px;
	}

	.bottom-bar .item:hover {
		background-color: #ccc;
	}

	.bottom-bar .view-buttons {
		display: flex;
		gap: 10px;
	}

	.bottom-bar .top-row {
		display: flex;
		gap: 10px;
		align-items: center;
		margin-bottom: 10px;
	}

	.sidebar-toggle {
		margin-bottom: 10px;
		padding: 5px 10px;
		background-color: #f0f0f0;
		border: 1px solid #ccc;
		cursor: pointer;
	}

	.sidebar-toggle:hover {
		background-color: #e0e0e0;
	}

	.sidebar-content {
		padding: 20px;
		box-sizing: border-box;
		flex: 1;
		overflow-y: auto;
	}

	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}

		.details {
			width: 100%;
			left: 0;
		}

		.details.right {
			left: 0;
			right: auto;
		}
	}

	@media (min-width: 769px) {
		.bottom-bar .view-buttons {
			display: none;
		}
	}
</style>
