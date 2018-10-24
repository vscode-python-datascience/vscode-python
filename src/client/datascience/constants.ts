// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

export namespace Commands {
    export const RunCell = 'python.datascience.runcell';
    export const RunCurrentCell = 'python.datascience.runcurrentcell';
    export const ShowHistoryPane = 'python.datascience.showhistorypane';
    export const TestHistoryPane = 'python.datascience.testhistorypane';
}

export namespace EditorContexts {
    export const HasCodeCells = 'python.datascience.hascodecells';
}

export namespace RegExpValues {
    export const PythonCellMarker = new RegExp('^(#\\s*%%|#\\s*\\<codecell\\>|#\\s*In\\[\\d*?\\]|#\\s*In\\[ \\])(.*)');
}

export namespace HistoryMessages {
    export const StartCell = 'start_cell';
    export const FinishCell = 'finish_cell';
    export const GotoCodeCell = 'gotocell_code';

    export const RestartKernel = 'restart_kernel';
    export const Export = 'export_to_ipynb';
}