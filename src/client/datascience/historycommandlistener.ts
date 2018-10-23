// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { ICommandManager, IApplicationEnvironment, IApplicationShell, IDocumentManager } from '../common/application/types';
import { IDisposableRegistry, IConfigurationService } from '../common/types';
import { IServiceContainer } from '../ioc/types';
import { Commands } from './constants';
import { IDataScienceCommandListener, IHistoryProvider } from './types';
import { JupyterImporter } from './jupyterImporter';
import * as localize from '../common/utils/localize';
import { CommandSource } from '../unittests/common/constants';
import { TextDocument, Uri } from 'vscode';

@injectable()
export class HistoryCommandListener implements IDataScienceCommandListener {
    private readonly disposableRegistry: IDisposableRegistry;
    private readonly historyProvider : IHistoryProvider;
    private readonly jupyterImporter : JupyterImporter;
    private readonly documentManager: IDocumentManager;
    private readonly applicationShell : IApplicationShell;
    private readonly configuration : IConfigurationService;

    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer)
    {
        this.historyProvider = this.serviceContainer.get<IHistoryProvider>(IHistoryProvider);
        this.documentManager = this.serviceContainer.get<IDocumentManager>(IDocumentManager);
        this.applicationShell = this.serviceContainer.get<IApplicationShell>(IApplicationShell);
        this.disposableRegistry = this.serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.configuration = this.serviceContainer.get<IConfigurationService>(IConfigurationService);
        this.jupyterImporter = new JupyterImporter(serviceContainer);

        // Listen to document open commands. We want to ask the user if they want to import.
        const disposable = this.documentManager.onDidOpenTextDocument(this.onOpenedDocument);
        this.disposableRegistry.push(disposable);
    }

    public register(commandManager: ICommandManager): void {
        let disposable = commandManager.registerCommand(Commands.ShowHistoryPane, this.showHistoryPane);
        this.disposableRegistry.push(disposable);
        disposable = commandManager.registerCommand(Commands.ImportNotebook, this.importNotebook);
        this.disposableRegistry.push(disposable);
        disposable = commandManager.registerCommand(Commands.ImportNotebookOnFile, (_, cmdSource: CommandSource = CommandSource.commandPalette, file: Uri) => { this.importNotebookOnFile(file.fsPath) });
        this.disposableRegistry.push(disposable);
    }

    private canImportFromOpenedFile= () => {
        const settings = this.configuration.getSettings();
        return settings && (!settings.datascience || settings.datascience.allowImportFromNotebook);
    }

    private disableImportOnOpenedFile = () => {
        const settings = this.configuration.getSettings();
        if (settings && settings.datascience) {
            settings.datascience.allowImportFromNotebook = false;
        }
    }

    private onOpenedDocument = async (document: TextDocument) => {
        if (document.fileName.endsWith('.ipynb') && this.canImportFromOpenedFile()) {
            const yes = localize.DataScience.notebookCheckForImportYes();
            const no = localize.DataScience.notebookCheckForImportNo();
            const dontAskAgain = localize.DataScience.notebookCheckForImportDontAskAgain();

            const answer = await this.applicationShell.showInformationMessage(
                localize.DataScience.notebookCheckForImportTitle(),
                yes, no, dontAskAgain);

            if (answer === yes) {
                await this.importNotebookOnFile(document.fileName);
            } else if (answer == dontAskAgain) {
                this.disableImportOnOpenedFile();
            }
        }

    }
    private showHistoryPane = async () : Promise<void> => {
        const active = await this.historyProvider.getOrCreateHistory();
        return active.show();
    }

    private importNotebook = async () : Promise<void> => {

        const filtersKey = localize.DataScience.importDialogFilter();
        const filtersObject = {};
        filtersObject[filtersKey] = ['ipynb'];

        const uris = await this.applicationShell.showOpenDialog(
            {
                openLabel: localize.DataScience.importDialogTitle(),
                filters: filtersObject
            });

        if (uris && uris.length > 0) {
            const contents = await this.jupyterImporter.importFromFile(uris[0].fsPath);
            const document = await this.documentManager.openTextDocument({language: 'python', content: contents});
        }
    }

    private importNotebookOnFile = async (file: string) : Promise<void> => {
        if (file && file.length > 0) {
            const contents = await this.jupyterImporter.importFromFile(file);
            const document = await this.documentManager.openTextDocument({language: 'python', content: contents});
        }
    }
}
