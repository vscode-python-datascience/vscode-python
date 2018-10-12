// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

export namespace Commands {
    export const DataScience = 'python.datascience';
    export const RunCell = 'python.datascience.runcell';
    export const ShowHistoryPane = 'python.datascience.showhistorypane';
    export const TestHistoryPane = 'python.datascience.testhistorypane';
}

export namespace RegExpValues {
    export const PythonCellMarker = new RegExp('^(#\\s*%%|#\\s*\\<codecell\\>|#\\s*In\\[\\d*?\\]|#\\s*In\\[ \\])(.*)');
}

export namespace HistoryMessages {
    export const UpdateState = 'update_state';
    export const DeleteCell = 'delete_cell';
    export const GotoCodeCell = 'gotocell_code';
}
