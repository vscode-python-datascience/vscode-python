// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { KernelMessage } from '@jupyterlab/services';
import { ICell } from './types';

export const parseExecuteMessage = (msg: KernelMessage.IExecuteResultMsg, cell: ICell) => {
    // Parsing actually happens on the view.
    cell.output = msg.content.data;

    // Used to do this.
    // Object.keys(msg.content.data).map((key: string) => {
    //     cell.output += parseFunctions[key](msg.content.data[key]);
    //     cell.types = [...cell.types, key];
    // });

};
