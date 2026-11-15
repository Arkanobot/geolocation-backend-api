import { loadConfig } from './config';
import { createGatewayApp } from './app';
import { runServer } from '../shared/helpers';

const config = loadConfig();
runServer(createGatewayApp(config), config.port, 'gateway');