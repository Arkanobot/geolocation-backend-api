import type {Response} from 'express';

export type ErrorBody = {
    error: {
        code: string;
        message: string;
    }
};

export const errorBody = (code: string, message: string): ErrorBody => ({
    error: {
        code,
        message,
    }
});

export const sendError = (res: Response, status: number, code: string, message: string): Response<ErrorBody> =>
    res.status(status).json(errorBody(code, message));