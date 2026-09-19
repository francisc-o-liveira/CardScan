import axios from "axios";
import { env } from "../../config/env";
import type { TcgdexSetBrief, TcgdexSetDetail } from "./tcgdex.types";

const tcgdexClient = axios.create({
  baseURL: env.POKEMON_API_URL,
  timeout: 20_000,
});

export const fetchSets = async (): Promise<TcgdexSetBrief[]> => {
  const { data } = await tcgdexClient.get<TcgdexSetBrief[]>("/sets");
  return data;
};

export const fetchSetDetail = async (setId: string): Promise<TcgdexSetDetail> => {
  const { data } = await tcgdexClient.get<TcgdexSetDetail>(`/sets/${setId}`);
  return data;
};
