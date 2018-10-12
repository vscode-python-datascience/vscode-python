// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { detectTheme } from '../react-common/themeDetector';
import './index.css';
import { MainPanel } from './MainPanel';
import { registerServiceWorker } from './registerServiceWorker';

const theme = detectTheme();

ReactDOM.render(
  <MainPanel theme={theme} />,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
