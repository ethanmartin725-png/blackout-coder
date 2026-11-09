# A teaching model of Ignition's system.* scripting API, for generating lesson outputs.
# Runs under real Jython 2.7 (tools/output-checks/ignition/vendor). It is not Ignition:
# only the functions the lessons use exist, and anything else raises NotModeled.
# Semantics and limits: docs/IGNITION_SIM.md
from system import tag, db, date, util, dataset
