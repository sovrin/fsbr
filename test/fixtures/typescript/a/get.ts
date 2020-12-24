import {send} from "micro";

export default async (req, res) => {
    send(res, 200, res.data);
}