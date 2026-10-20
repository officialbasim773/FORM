"use client";
import { PRODUCT_NAME } from "@/lib/config";

export default function Brand() {
  return (
    <a className="brand" href="/">
      <span className="brand-mark">f</span>
      {PRODUCT_NAME}
    </a>
  );
}
