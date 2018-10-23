// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IServiceContainer } from '../ioc/types';
import { IHistory, IHistoryProvider } from './types';
import { History } from './history';
import { IApplicationShell } from '../common/application/types';
import * as localize from '../common/utils/localize';
import { IPythonExecutionFactory, IPythonExecutionService } from '../common/process/types';
import { Deferred, createDeferred } from '../common/utils/async';
import { PythonSettings } from '../common/configSettings';
import { IConfigurationService } from '../common/types';
import { IDisposable } from '@phosphor/disposable';
import * as temp from 'temp';
import * as tp from 'typed-promisify';

export class JupyterImporter implements IDisposable {
    // Template that changes markdown cells to have # %% [markdown] in the comments
    private readonly nbconvertTemplate = `
    {%- extends 'null.tpl' -%}
    {% block in_prompt %}
    {% endblock in_prompt %}

    {% block input %}
    {{ cell.source | ipython2python }}
    {% endblock input %}

    {% block markdowncell scoped %}
    #%% [markdown]
    {{ cell.source | comment_lines }}
    {% endblock markdowncell %}`;

    private pythonExecutionService : Deferred<IPythonExecutionService>;
    private templatePromise : Promise<string>;
    public isDisposed : boolean = false;

    constructor(private serviceContainer: IServiceContainer) {
        const configuration = this.serviceContainer.get<IConfigurationService>(IConfigurationService);
        (configuration.getSettings() as PythonSettings).addListener('change', this.onSettingsChanged);
        this.templatePromise = this.createTemplateFile();
    }

    public importFromFile = async (file: string) : Promise<string> => {
        const executionService = await this.getExecutionService();
        const template = await this.templatePromise;

        // Use the jupyter nbconvert functionality to turn the notebook into a python file
        if (await this.isSupported()) {
            const executionService = await this.getExecutionService();
            const result = await executionService.execModule('jupyter', ['nbconvert', file, '--to', 'python', '--stdout', '--template', template], { throwOnStdErr: true, encoding: 'utf8' });
            return result.stdout;
        }

    }

    public isSupported = async () : Promise<boolean> => {
        try {
            // Make sure we have nbconvert installed
            const executionService = await this.getExecutionService();
            const result = await executionService.execModule('jupyter', ['nbconvert', '--version'], { throwOnStdErr: true, encoding: 'utf8' });
            return (!result.stderr);
        } catch {
            return false;
        }
    }

    public dispose = () => {
        this.isDisposed = true;
        const configuration = this.serviceContainer.get<IConfigurationService>(IConfigurationService);
        (configuration.getSettings() as PythonSettings).removeListener('change', this.onSettingsChanged);
    }

    private getExecutionService = () : Promise<IPythonExecutionService> => {
        return this.pythonExecutionService.promise;
    }

    private createTemplateFile = async () : Promise<string> => {
        // Create a temp file on disk
        const asyncOpen = tp.promisify(temp.open);
        const file: temp.OpenFile = await asyncOpen({ suffix: '.tpl'});
        return file.path;
    }

    private onSettingsChanged = () => {
        // Recreate our promise for our execution service whenever the settings change
        this.createExecutionServicePromise();
    }

    private createExecutionServicePromise = () => {
        // Create a deferred promise that resolves when we have an execution service
        this.pythonExecutionService = createDeferred<IPythonExecutionService>();
        this.serviceContainer.get<IPythonExecutionFactory>(IPythonExecutionFactory)
            .create({}).then((p : IPythonExecutionService) => { this.pythonExecutionService.resolve(p); })
            .catch(this.pythonExecutionService.reject());
    }
}
