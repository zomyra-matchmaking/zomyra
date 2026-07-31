/**
 * Typed react-redux hooks. Use these, never the untyped originals — they carry
 * `RootState` and `AppDispatch`, so a selector reading a field that does not
 * exist is a compile error.
 */
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "./index";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
