// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IServiceManager } from '../ioc/types';
import { DataScienceCodeLensProvider } from './codelensprovider';
import { CodeWatcher } from './codewatcher';
import { DataScience } from './datascience';
import { HistoryCommandListener } from './historycommandlistener';
import { HistoryProvider } from './historyprovider';
import { JupyterServerProvider } from './jupyterserverprovider';
import { ICodeWatcher, IDataScience, IDataScienceCodeLensProvider, IDataScienceCommandListener, IHistoryProvider, IJupyterServerProvider  } from './types';

export function registerTypes(serviceManager: IServiceManager) {
    serviceManager.addSingleton<ICodeWatcher>(ICodeWatcher, CodeWatcher);
    serviceManager.addSingleton<IDataScienceCodeLensProvider>(IDataScienceCodeLensProvider, DataScienceCodeLensProvider);
    serviceManager.addSingleton<IDataScience>(IDataScience, DataScience);
    serviceManager.addSingleton<IJupyterServerProvider>(IJupyterServerProvider, JupyterServerProvider);
    serviceManager.add<IDataScienceCommandListener>(IDataScienceCommandListener, HistoryCommandListener);
    serviceManager.addSingleton<IHistoryProvider>(IHistoryProvider, HistoryProvider);
}