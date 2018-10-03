// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IServiceManager } from '../ioc/types';
import { DataScience } from './datascience';
import { JupyterServerProvider } from './jupyterserverprovider';
import { IDataScience, IJupyterServerProvider, IDataScienceCommandListener } from './types';
import { HistoryCommandListener } from './historycommandlistener';

export function registerTypes(serviceManager: IServiceManager) {
    serviceManager.addSingleton<IDataScience>(IDataScience, DataScience);
    serviceManager.addSingleton<IJupyterServerProvider>(IJupyterServerProvider, JupyterServerProvider);
    serviceManager.add<IDataScienceCommandListener>(IDataScienceCommandListener, HistoryCommandListener);
}
