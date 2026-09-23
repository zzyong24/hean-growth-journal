import {Kind} from "./domain";
// Presentation groups only; event types and persistence stay owned by the domain.
export const recordGroups: {zh:string;en:string;kinds:Kind[]}[] = [
 {zh:"喂养",en:"Feeding",kinds:["bottle","nursing","pumping","food"]},
 {zh:"日常照护",en:"Daily care",kinds:["diaper","sleep","note"]},
 {zh:"生长测量",en:"Growth",kinds:["weight","height","head"]},
 {zh:"健康记录",en:"Health logs",kinds:["temperature","medicine","supplement"]},
];
