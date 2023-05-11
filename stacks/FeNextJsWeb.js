import { StaticSite } from "sst/constructs";

export function FeNextJsWeb({ stack }) {
	const bucketprefix = "fe-next-js-web";
	const environment = "dev";
	const bucketName = `${bucketprefix}-${environment}`;

	// Deploy our web app
	const site = new StaticSite(stack, "FeNextJsWebSite", {
		path: "fe-next-js-web",
		buildCommand: "yarn run build:dev",
		buildOutput: "out",
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
