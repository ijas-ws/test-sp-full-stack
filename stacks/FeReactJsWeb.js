import { StaticSite } from "sst/constructs";

export function FeReactJsWeb({ stack }) {
	const bucketprefix = "fe-react-js-web";
	const environment = "dev";
	const bucketName = `${bucketprefix}-${environment}`;

	// Deploy our web app
	const site = new StaticSite(stack, "FeReactJsWebSite", {
		path: "fe-react-js-web",
		buildCommand: "yarn run build:dev",
		buildOutput: "build",
		cdk: {
			bucket: {
				bucketName,
			},
			distribution: {
				comment: `Distribution for ${bucketName}`,
			},
		},
	});

	// Show the URLs in the output
	stack.addOutputs({
		siteUrl: site.url || "http://localhost:3000/",
		distributionId: site.cdk?.distribution?.distributionId,
		bucketName: site.cdk?.bucket?.bucketName,
	});
}
