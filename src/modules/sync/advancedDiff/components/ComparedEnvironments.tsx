type ComparedEnvironmentsProps = Readonly<{
  sourceEnvId: string;
  targetEnvId: string;
  disableLinks?: boolean;
}>;

export const ComparedEnvironments = ({
  sourceEnvId,
  targetEnvId,
  disableLinks = false,
}: ComparedEnvironmentsProps) => (
  <div className="compared-environments">
    <div className="environment-info">
      <div className="env-type">SOURCE</div>
      <div id="source-env">{sourceEnvId}</div>
      <a className={disableLinks ? "disabled" : ""} href={`https://app.kontent.ai/${sourceEnvId}`}>
        OPEN ENVIRONMENT
      </a>
    </div>
    <div className="environment-info arrow">⇉</div>
    <div className="environment-info">
      <div className="env-type">TARGET</div>
      <div id="target-env">{targetEnvId}</div>
      <a href={`https://app.kontent.ai/${targetEnvId}`}>OPEN ENVIRONMENT</a>
    </div>
  </div>
);
