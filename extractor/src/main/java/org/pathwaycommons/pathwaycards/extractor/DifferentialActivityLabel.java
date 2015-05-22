package org.pathwaycommons.pathwaycards.extractor;

import org.biopax.paxtools.model.level3.PhysicalEntity;
import org.biopax.paxtools.pattern.Match;
import org.biopax.paxtools.pattern.constraint.ConstraintAdapter;

/**
 * @author Ozgun Babur
 */
public class DifferentialActivityLabel extends ConstraintAdapter
{
	private Integer desired;

	public DifferentialActivityLabel(Integer desiredChange)
	{
		super(2);
		desired = desiredChange;
	}

	@Override
	public boolean satisfies(Match match, int... ind)
	{
		PhysicalEntity pe1 = (PhysicalEntity) match.get(ind[0]);
		PhysicalEntity pe2 = (PhysicalEntity) match.get(ind[1]);

		int activity = FieldReaderUtil.readDifferentialActivity(pe1, pe2);

		if (desired == null) return activity != 0;
		else return desired == activity;
	}
}
