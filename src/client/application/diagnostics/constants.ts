// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

export enum DiagnosticCodes {
    InvalidEnvironmentPathVariableDiagnostic = 'InvalidEnvironmentPathVariableDiagnostic',
    InvalidDebuggerTypeDiagnostic = 'InvalidDebuggerTypeDiagnostic',
    NoPythonInterpretersDiagnostic = 'NoPythonInterpretersDiagnostic',
    MacInterpreterSelectedAndNoOtherInterpretersDiagnostic = 'MacInterpreterSelectedAndNoOtherInterpretersDiagnostic',
    MacInterpreterSelectedAndHaveOtherInterpretersDiagnostic = 'MacInterpreterSelectedAndHaveOtherInterpretersDiagnostic',
    InvalidPythonPathInDebuggerDiagnostic = 'InvalidPythonPathInDebuggerDiagnostic',
    EnvironmentActivationInPowerShellWithBatchFilesNotSupportedDiagnostic = 'EnvironmentActivationInPowerShellWithBatchFilesNotSupportedDiagnostic'
}
