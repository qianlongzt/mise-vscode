import * as vscode from "vscode";
import { MiseService } from "./miseService";
import { MiseEnvsProvider } from "./providers/envProvider";
import {
	MiseTasksProvider,
	registerMiseCommands,
} from "./providers/tasksProvider";
import { MiseToolsProvider } from "./providers/toolsProvider";

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	const miseService = new MiseService();

	const tasksProvider = new MiseTasksProvider(miseService);
	const toolsProvider = new MiseToolsProvider(miseService);
	const envsProvider = new MiseEnvsProvider(miseService);

	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100,
	);
	statusBarItem.show();
	statusBarItem.text = "$(tools) Mise";
	statusBarItem.tooltip = "Click to refresh Mise";
	registerMiseCommands(context, tasksProvider);

	vscode.window.registerTreeDataProvider("miseTasksView", tasksProvider);
	vscode.window.registerTreeDataProvider("miseToolsView", toolsProvider);
	vscode.window.registerTreeDataProvider("miseEnvsView", envsProvider);

	statusBarItem.command = "mise.refreshEntry";
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);

	context.subscriptions.push(
		vscode.commands.registerCommand("mise.refreshEntry", async () => {
			await vscode.commands.executeCommand(
				"workbench.view.extension.mise-panel",
			);

			statusBarItem.text = "$(sync~spin) Mise";
			try {
				statusBarItem.text = "$(check) Mise";
				tasksProvider.refresh();
				toolsProvider.refresh();
				envsProvider.refresh();
				statusBarItem.text = "$(tools) Mise";
			} catch (error) {
				statusBarItem.text = "$(error) Mise";
				vscode.window.showErrorMessage(
					`Failed to refresh Mise views: ${error}`,
				);
			}
		}),
	);
}

export function deactivate() {
	if (statusBarItem) {
		statusBarItem.dispose();
	}
}
