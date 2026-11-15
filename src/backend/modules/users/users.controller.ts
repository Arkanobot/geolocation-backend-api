import type { RequestHandler } from 'express';
import { getProfile, loginUser, registerUser } from './users.service';
import { parseLoginInput, parseRegisterInput } from './users.validation';

export const register: RequestHandler = async (req, res) => {
  res.status(201).json(await registerUser(parseRegisterInput(req.body)));
};

export const login: RequestHandler = async (req, res) => {
  res.json(await loginUser(parseLoginInput(req.body)));
};

// authenticate middleware guarantees req.user
export const me: RequestHandler = async (req, res) => {
  res.json(await getProfile(req.user!.id));
};