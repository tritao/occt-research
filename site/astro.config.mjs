// @ts-check
import { defineConfig } from 'astro/config';
import mermaid from 'astro-mermaid';
import starlight from '@astrojs/starlight';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const [ghOwner, ghRepo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const ghRepoName = ghRepo ?? '';
const isUserOrOrgPagesRepo = ghRepoName.endsWith('.github.io');

// https://astro.build/config
export default defineConfig({
	...(isGitHubActions && ghOwner && ghRepo
		? { site: `https://${ghOwner}.github.io`, base: isUserOrOrgPagesRepo ? '/' : `/${ghRepo}/` }
		: {}),
	integrations: [
		mermaid({ autoTheme: true }),
		starlight({
			title: 'OCCT Research',
			sidebar: [
				{ label: 'Start', items: [{ label: 'Overview', slug: 'occt' }] },
				{
					label: 'Lanes',
					items: [
						{
							label: 'Core Kernel',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-core-kernel' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-core-kernel' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-core-kernel' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/core-kernel' },
								{ label: 'Cases', slug: 'occt/walkthroughs/core-kernel-cases' },
								{ label: 'Repro', slug: 'occt/repros/lane-core-kernel/readme' },
							],
						},
						{
							label: 'Topology Data Model',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-topology-data-model' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-topology-data-model' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-topology-data-model' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/topology-data-model' },
								{ label: 'Cases', slug: 'occt/walkthroughs/topology-data-model-cases' },
								{ label: 'Repro', slug: 'occt/repros/lane-topology-data-model/readme' },
							],
						},
						{
							label: 'B-Rep Geometry Bridge',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-brep-geometry-bridge' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-brep-geometry-bridge' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-brep-geometry-bridge' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/brep-geometry-bridge' },
								{ label: 'Cases', slug: 'occt/walkthroughs/brep-geometry-bridge-cases' },
								{ label: 'Repro', slug: 'occt/repros/lane-brep-geometry-bridge/readme' },
							],
						},
						{
							label: 'Booleans',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-booleans' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-booleans' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-booleans' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/booleans' },
								{ label: 'Cases', slug: 'occt/walkthroughs/booleans-cases' },
								{ label: 'Repro', slug: 'occt/repros/lane-booleans/readme' },
							],
						},
						{
							label: 'Fillets',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-fillets' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-fillets' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-fillets' },
								{ label: 'Algorithm (ChFi3d)', slug: 'occt/dossiers/algorithm-fillets-chfi3d' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/fillets' },
								{ label: 'Cases', slug: 'occt/walkthroughs/fillets-cases' },
								{ label: 'Repro', slug: 'occt/repros/lane-fillets/readme' },
							],
						},
						{
							label: 'Shape Healing + Analysis',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-shape-healing-analysis' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-shape-healing-analysis' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-shape-healing-analysis' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/shape-healing-analysis' },
								{
									label: 'Cases',
									slug: 'occt/walkthroughs/shape-healing-analysis-cases',
								},
								{
									label: 'Repro',
									slug: 'occt/repros/lane-shape-healing-analysis/readme',
								},
							],
						},
						{
							label: 'Meshing',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-meshing' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-meshing' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-meshing' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/meshing' },
								{ label: 'Cases', slug: 'occt/walkthroughs/meshing-cases' },
								{ label: 'Repro', slug: 'occt/repros/lane-meshing/readme' },
							],
						},
						{
							label: 'Data Exchange',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-data-exchange' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-data-exchange' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-data-exchange' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/data-exchange' },
								{ label: 'Cases', slug: 'occt/walkthroughs/data-exchange-cases' },
								{ label: 'Repro', slug: 'occt/repros/lane-data-exchange/readme' },
							],
						},
						{
							label: 'Visualization',
							items: [
								{ label: 'Overview', slug: 'occt/maps/hub-visualization' },
								{ label: 'Lane Map', slug: 'occt/maps/lane-visualization' },
								{ label: 'Dossier', slug: 'occt/dossiers/lane-visualization' },
								{ label: 'Walkthrough', slug: 'occt/walkthroughs/visualization' },
								{ label: 'Cases', slug: 'occt/walkthroughs/visualization-cases' },
								{ label: 'Repro', slug: 'occt/repros/lane-visualization/readme' },
							],
						},
					],
				},
				{
					label: 'Indexes',
					items: [
						{ label: 'Lane List', slug: 'occt/maps/lanes' },
						{ label: 'Packages', slug: 'occt/maps/packages' },
						{ label: 'Include Graph (Core)', slug: 'occt/maps/include_graphcore' },
						{ label: 'Include Graph (Exchange/Vis)', slug: 'occt/maps/include_graphexchange_vis' },
					],
				},
				{ label: 'Workflow', autogenerate: { directory: 'occt/backlog/docs' } },
			],
		}),
	],
});
