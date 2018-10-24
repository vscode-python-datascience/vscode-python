// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { DiagnosticSeverity } from 'vscode';
import '../../../common/extensions';
import { Logger } from '../../../common/logger';
import { useCommandPromptAsDefaultShell } from '../../../common/terminal/commandPrompt';
import { IConfigurationService, ICurrentProcess } from '../../../common/types';
import { IServiceContainer } from '../../../ioc/types';
import { BaseDiagnostic, BaseDiagnosticsService } from '../base';
import { IDiagnosticsCommandFactory } from '../commands/types';
import { DiagnosticCodes } from '../constants';
import { DiagnosticCommandPromptHandlerServiceId, MessageCommandPrompt } from '../promptHandler';
import { DiagnosticScope, IDiagnostic, IDiagnosticHandlerService } from '../types';

const PowershellActivationNotSupportedWithBatchFilesMessage = 'Activation of the selected Python environment is not supported in PowerShell. Consider changing your shell to Command Prompt.';

export class PowershellActivationNotAvailableDiagnostic extends BaseDiagnostic {
    constructor() {
        super(DiagnosticCodes.EnvironmentActivationInPowerShellWithBatchFilesNotSupportedDiagnostic,
            PowershellActivationNotSupportedWithBatchFilesMessage,
            DiagnosticSeverity.Warning, DiagnosticScope.Global);
    }
}

export const PowerShellActivationHackDiagnosticsServiceId = 'EnvironmentActivationInPowerShellWithBatchFilesNotSupportedDiagnostic';

@injectable()
export class PowerShellActivationHackDiagnosticsService extends BaseDiagnosticsService {
    protected readonly messageService: IDiagnosticHandlerService<MessageCommandPrompt>;
    constructor(@inject(IServiceContainer) serviceContainer: IServiceContainer) {
        super([DiagnosticCodes.EnvironmentActivationInPowerShellWithBatchFilesNotSupportedDiagnostic], serviceContainer);
        this.messageService = serviceContainer.get<IDiagnosticHandlerService<MessageCommandPrompt>>(IDiagnosticHandlerService, DiagnosticCommandPromptHandlerServiceId);
    }
    public async diagnose(): Promise<IDiagnostic[]> {
        return [];
    }
    public async handle(diagnostics: IDiagnostic[]): Promise<void> {
        // This class can only handle one type of diagnostic, hence just use first item in list.
        if (diagnostics.length === 0 || !this.canHandle(diagnostics[0])) {
            return;
        }
        const diagnostic = diagnostics[0];
        if (await this.filterService.shouldIgnoreDiagnostic(diagnostic.code)) {
            return;
        }
        const commandFactory = this.serviceContainer.get<IDiagnosticsCommandFactory>(IDiagnosticsCommandFactory);
        const currentProcess = this.serviceContainer.get<ICurrentProcess>(ICurrentProcess);
        const configurationService = this.serviceContainer.get<IConfigurationService>(IConfigurationService);
        const options = [
            {
                prompt: 'Use Command Prompt',
                // tslint:disable-next-line:no-object-literal-type-assertion
                command: {
                    diagnostic, invoke: async (): Promise<void> => {
                        useCommandPromptAsDefaultShell(currentProcess, configurationService)
                            .catch(ex => Logger.error('Use Command Prompt as default shell', ex));
                    }
                }
            },
            {
                prompt: 'Ignore'
            },
            {
                prompt: 'Always Ignore',
                command: commandFactory.createCommand(diagnostic, { type: 'ignore', options: DiagnosticScope.Global })
            },
            {
                prompt: 'More Info',
                command: commandFactory.createCommand(diagnostic, { type: 'launch', options: 'https://aka.ms/CondaPwsh' })
            }
        ];

        await this.messageService.handle(diagnostic, { commandPrompts: options });
    }
}
