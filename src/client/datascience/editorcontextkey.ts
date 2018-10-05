// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { commands } from 'vscode';

export class EditorContextKey {
    private _name: string;
    private _lastValue: boolean;

    constructor(name: string) {
        this._name = name;
        this._lastValue = false;
    }

    public set(value: boolean): void {
        if (this._lastValue === value) {
            return;
        }
        this._lastValue = value;
        commands.executeCommand('setContext', this._name, this._lastValue);
    }
}
