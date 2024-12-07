import * as vscode from "vscode";
import { getRootFolder, isMiseExtensionEnabled } from "./configuration";
import type { MiseService } from "./miseService";
import { logger } from "./utils/logger";
import {
	allowedFileTaskDirs,
	idiomaticFiles,
	misePatterns,
} from "./utils/miseUtilts";

export class MiseFileWatcher {
	private readonly fileWatchers: vscode.FileSystemWatcher[];
	private context: vscode.ExtensionContext;
	private miseService: MiseService;
	private readonly onConfigChangeCallback: (uri: vscode.Uri) => Promise<void>;

	constructor(
		context: vscode.ExtensionContext,
		miseService: MiseService,
		onConfigChangeCallback: (uri: vscode.Uri) => Promise<void>,
	) {
		this.context = context;
		this.miseService = miseService;
		this.onConfigChangeCallback = onConfigChangeCallback;
		this.fileWatchers = [];
		this.initializeFileWatcher().catch((error) => {
			logger.warn("Error initializing file watcher");
			logger.info("Unable to initialize file watcher", { error });
		});
	}

	private async initializeFileWatcher() {
		const rootFolder = getRootFolder();
		if (!rootFolder) {
			return;
		}

		this.fileWatchers.push(
			vscode.workspace.createFileSystemWatcher(
				new vscode.RelativePattern(rootFolder, `{${misePatterns}}`),
			),
		);

		const configFiles = await this.miseService.getMiseConfigFiles();
		for (const file of configFiles) {
			this.fileWatchers.push(
				vscode.workspace.createFileSystemWatcher(
					new vscode.RelativePattern(vscode.Uri.file(file.path), "*"),
				),
			);
		}

		this.fileWatchers.push(
			vscode.workspace.createFileSystemWatcher(
				new vscode.RelativePattern(rootFolder, `{${idiomaticFiles}}`),
			),
		);

		this.fileWatchers.push(
			vscode.workspace.createFileSystemWatcher(
				new vscode.RelativePattern(
					rootFolder,
					`{${allowedFileTaskDirs.map((dir) => `${dir}/**/*`)}}`,
				),
			),
		);

		for (const watcher of this.fileWatchers) {
			this.context.subscriptions.push(watcher);
			watcher.onDidChange(this.handleFileChange.bind(this));
			watcher.onDidCreate(this.handleFileChange.bind(this));
			watcher.onDidDelete(this.handleFileChange.bind(this));
		}
	}

	private async handleFileChange(uri: vscode.Uri) {
		if (!isMiseExtensionEnabled()) {
			return;
		}

		try {
			const { stdout } = await this.miseService.execMiseCommand("tasks ls");

			if (stdout) {
				await this.onConfigChangeCallback(uri);
			}
		} catch (error) {
			logger.info(`Error while handling file change ${error}`);
		}
	}

	public dispose() {
		for (const watcher of this.fileWatchers) {
			watcher.dispose();
		}
	}
}
