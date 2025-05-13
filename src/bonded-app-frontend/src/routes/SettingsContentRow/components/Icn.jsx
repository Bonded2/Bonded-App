import React from "react";
import { IconChevron } from "../icons/IconChevron";
import "./icn.css";

export const Icn = ({
  icon,
  rectangleClassName,
  rectangleClassNameOverride,
  divClassName,
}) => {
  return (
    <>
      {icon === "burger" && (
        <div className="icn">
          <div className={`rectangle-6 ${rectangleClassName}`} />
          <div className={`rectangle-6 ${rectangleClassNameOverride}`} />
          <div className={`rectangle-6 ${divClassName}`} />
        </div>
      )}
      {icon === "chevron" && <IconChevron className="icon-chevron" />}
    </>
  );
};
