import { config } from "./config";
import {createApp} from "./app";
import {runServer} from "../shared/helpers";

runServer(createApp(), config.port, 'backend');