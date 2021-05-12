import FriendFacade from '../facades/friendFacade';
import { IFriend } from '../interfaces/IFriend';
import PositionFacade from '../facades/positionFacade';
import { ApiError } from '../errors/errors';
import { Request } from "express";
import fetch from "node-fetch"


interface IPositionInput {
  email: string
  longitude: number
  latitude: number
}

let friendFacade: FriendFacade;
let positionFacade: PositionFacade;

/*
We don't have access to app or the Router so we need to set up the facade in another way
In www.ts IMPORT and CALL the method below, like so: 
      setupFacade(db);
Just before the line where you start the server
*/
export function setupFacade(db: any) {
  if (!friendFacade) {
    friendFacade = new FriendFacade(db)
  }
  if (!positionFacade) {
    positionFacade = new PositionFacade(db)
  }
}


// resolver map
export const resolvers = {
  Query: {

    getAllFriends: (root: any, _: any, context: any) => {

      if (!context.credentials.role || context.credentials.role !== "admin") {
        throw new ApiError("Not Authorized", 401)
      }

      return friendFacade.getAllFriendsV2()

    },
    getFriendFromId: async (_: any, { id }: { id: string }) => {
      return friendFacade.getFriendFromId(id)
    },
    getFriendFromEmail: async (_: any, { id }: { id: string }) => {
      return friendFacade.getFriendFromEmail(id)
    },

    getAllFriendsProxy: async (root: object, _: any, context: Request) => {

      let options: any = { method: "GET" }

      //This part only required if authentication is required
      const auth = context.get("authorization");
      if (auth) {
        options.headers = { 'authorization': auth }
      }
      return fetch(`http://localhost:${process.env.PORT}/api/friends/all`, options).then(r => {
        if (r.status >= 400) { throw new Error(r.statusText) }
        return r.json()
      })
    }
  },
  Mutation: {
    createFriend: async (_: object, { input }: { input: IFriend }) => {
      return friendFacade.addFriendV2(input)
    },
    editFriend: async (_: object, { input }: { input: IFriend }) => {
      return friendFacade.editFriend(input.email, input)
    },
    deleteFriend: async (_: object, { email }: { email: string }, req: any) => {
      if (!req.credentials.role || req.credentials.role !== "admin") {
        throw new ApiError("Not Authorized", 401)
      }
      return friendFacade.deleteFriend(email);
    },
    addPosition: async (_: object, { input }: { input: IPositionInput }) => {
      try {
        positionFacade.addOrUpdatePosition(input.email, input.longitude, input.latitude)
        return true
      } catch (err) {
        return false
      }
    },
    findNearbyFriends: async (_: object, { input, distance }: { input: IPositionInput, distance: number }) => {
      return positionFacade.findNearbyFriends(input.email, "", input.longitude, input.latitude, distance);
    },

  }
};
