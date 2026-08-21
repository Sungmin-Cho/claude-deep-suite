# Deep-Loop Walkthrough Example

This example demonstrates a self-contained, durable multi-session execution loop using the lifecycle patterns of the `deep-loop` plugin.

## Lifecycle Phases Explained

1. **Start**: Initializes the loop parameters, constructs the baseline session context, and registers a unique tracking ID.
2. **Continue**: Processes execution milestones iteratively, safely persisting intermediate data points at specified process boundaries.
3. **Resume**: Safely spins back up a suspended or multi-session instance from persistent storage without mutating historical checkpoints.
4. **Finish**: Evaluates termination constraints, finalizes data reduction, and updates status flags to prevent accidental reruns.

## Running the Walkthrough

Execute the script inside this directory to trace the sequential state outputs across execution lifecycles:

```bash
node index.js