import { Fragment } from "react";
import ModelManagementPanel from "./components/ModelManagementPanel";
import ModelLineagePanel from "./components/ModelLineagePanel";

export default function Models(){
  return (
    <Fragment>
      <ModelManagementPanel />
      <div className="h-4" />
      <ModelLineagePanel />
    </Fragment>
  );
}
