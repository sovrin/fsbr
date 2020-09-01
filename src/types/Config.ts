export type Keys = "entry" | "ext";

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 11:09
 */
export type Config = {
    [key in Keys]: string;
};