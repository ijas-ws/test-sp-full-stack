import dotenv from "dotenv";
import { FeNextJsWeb } from "./stacks/FeNextJsWeb";
import { BeNodeHapiPg } from "./stacks/BeNodeHapiPg";

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
		app.stack(FeNextJsWeb).stack(BeNodeHapiPg);
	},
};
