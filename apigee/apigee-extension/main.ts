import cli from "./cli";

cli.exec().catch((err: any) => {
  console.error(err);
  process.exit(err.exitCode || 1);
});
