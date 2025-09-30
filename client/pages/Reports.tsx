import { Fragment } from "react";
import RegulatoryReportsTab from "./components/RegulatoryReportsTab";
import ComplianceAuditTab from "./components/ComplianceAuditTab";

export default function Reports(){
  return (
    <Fragment>
      <RegulatoryReportsTab />
      <div className="h-4" />
      <ComplianceAuditTab />
    </Fragment>
  );
}
