import {flush} from "../../../utils";

export default async (req, res) => {
    flush(res, 200, res.data);
}
