const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const roomService = require("../services/room.service");

const list = asyncHandler(async (req, res) => {
  const rooms = await roomService.listRooms(req.query, Boolean(req.admin));
  sendSuccess(res, rooms, 200, { count: rooms.length });
});

const getOne = asyncHandler(async (req, res) => {
  sendSuccess(res, await roomService.getRoomByIdOrSlug(req.params.idOrSlug, Boolean(req.admin)));
});

const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await roomService.createRoom(req.body), 201);
});

const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await roomService.updateRoom(req.params.id, req.body));
});

const remove = asyncHandler(async (req, res) => {
  await roomService.deleteRoom(req.params.id);
  res.status(204).end();
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};
