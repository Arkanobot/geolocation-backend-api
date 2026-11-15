import type {Application} from 'express';

export const runServer = (app: Application, port: number, name = 'Server'): void => {
    app.listen(port, ()=> console.log(`${name} is running on port: ${port}`));
}

