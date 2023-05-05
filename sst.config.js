import dotenv from "dotenv";
import { WedNextJsWeb } from "./stacks/WedNextJsWeb";
import { WedNodeHapiPg } from "./stacks/WedNodeHapiPg";

dotenv.config({ path: ".env" });

export default {
	config(_input) {
		return {
			name: process.env.APP_NAME || "web-app",
			region: process.env.AWS_REGION || "ap-south-1",
		};
	},
	stacks(app) {
		// deploy stacks
		app.stack(WedNextJsWeb).stack(WedNodeHapiPg);
	},
};
