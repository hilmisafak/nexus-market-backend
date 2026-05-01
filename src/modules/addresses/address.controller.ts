import type { Request, Response } from "express";
import {
  createAddress,
  deleteAddress,
  listMyAddresses,
  updateAddress,
} from "./address.service.js";

export const createAddressHandler = async (req: Request, res: Response) => {
  const address = await createAddress(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: address });
};

export const listMyAddressesHandler = async (req: Request, res: Response) => {
  const addresses = await listMyAddresses(req.user!.userId);
  res.status(200).json({ success: true, data: addresses });
};

export const updateAddressHandler = async (req: Request, res: Response) => {
  const address = await updateAddress(req.user!.userId, String(req.params.id), req.body);
  res.status(200).json({ success: true, data: address });
};

export const deleteAddressHandler = async (req: Request, res: Response) => {
  await deleteAddress(req.user!.userId, String(req.params.id));
  res.status(204).send();
};
