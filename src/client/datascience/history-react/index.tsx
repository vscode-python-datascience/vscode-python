// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { MainPanel } from './MainPanel';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';

ReactDOM.render(
  <MainPanel />,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
