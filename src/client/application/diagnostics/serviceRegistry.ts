// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IServiceManager } from '../../ioc/types';
import { EnvironmentPathVariableDiagnosticsService, EnvironmentPathVariableDiagnosticsServiceId } from './checks/envPathVariable';
import { InvalidDebuggerTypeDiagnosticsService, InvalidDebuggerTypeDiagnosticsServiceId } from './checks/invalidDebuggerType';
import { InvalidPythonPathInDebuggerService, InvalidPythonPathInDebuggerServiceId } from './checks/invalidPythonPathInDebugger';
import { PowerShellActivationHackDiagnosticsService, PowerShellActivationHackDiagnosticsServiceId } from './checks/powerShellActivation';
import { InvalidPythonInterpreterService, InvalidPythonInterpreterServiceId } from './checks/pythonInterpreter';
import { DiagnosticsCommandFactory } from './commands/factory';
import { IDiagnosticsCommandFactory } from './commands/types';
import { DiagnosticFilterService } from './filter';
import { DiagnosticCommandPromptHandlerService, DiagnosticCommandPromptHandlerServiceId, MessageCommandPrompt } from './promptHandler';
import { IDiagnosticFilterService, IDiagnosticHandlerService, IDiagnosticsService } from './types';

export function registerTypes(serviceManager: IServiceManager) {
    serviceManager.addSingleton<IDiagnosticFilterService>(IDiagnosticFilterService, DiagnosticFilterService);
    serviceManager.addSingleton<IDiagnosticHandlerService<MessageCommandPrompt>>(IDiagnosticHandlerService, DiagnosticCommandPromptHandlerService, DiagnosticCommandPromptHandlerServiceId);
    serviceManager.addSingleton<IDiagnosticsService>(IDiagnosticsService, EnvironmentPathVariableDiagnosticsService, EnvironmentPathVariableDiagnosticsServiceId);
    serviceManager.addSingleton<IDiagnosticsService>(IDiagnosticsService, InvalidDebuggerTypeDiagnosticsService, InvalidDebuggerTypeDiagnosticsServiceId);
    serviceManager.addSingleton<IDiagnosticsService>(IDiagnosticsService, InvalidPythonInterpreterService, InvalidPythonInterpreterServiceId);
    serviceManager.addSingleton<IDiagnosticsService>(IDiagnosticsService, InvalidPythonPathInDebuggerService, InvalidPythonPathInDebuggerServiceId);
    serviceManager.addSingleton<IDiagnosticsService>(IDiagnosticsService, PowerShellActivationHackDiagnosticsService, PowerShellActivationHackDiagnosticsServiceId);
    serviceManager.addSingleton<IDiagnosticsCommandFactory>(IDiagnosticsCommandFactory, DiagnosticsCommandFactory);
}
