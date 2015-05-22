package org.pathwaycommons.pathwaycards.extractor;

import org.biopax.paxtools.controller.PathAccessor;
import org.biopax.paxtools.model.level3.Complex;
import org.biopax.paxtools.model.level3.Named;
import org.biopax.paxtools.model.level3.SmallMoleculeReference;
import org.biopax.paxtools.pattern.Match;
import org.biopax.paxtools.pattern.constraint.ConstraintAdapter;

/**
 * @author Ozgun Babur
 */
public class ComplexContainsSmallMol extends ConstraintAdapter
{
	public static final PathAccessor PA = new PathAccessor("Complex/component*:SmallMolecule/entityReference");

	private String SMName;

	public ComplexContainsSmallMol(String smName)
	{
		super(1);
		this.SMName = smName;
	}

	@Override
	public boolean satisfies(Match match, int... ind)
	{
		Complex cpx = (Complex) match.get(ind[0]);

		for (Object o : PA.getValueFromBean(cpx))
		{
			if (o instanceof SmallMoleculeReference)
			{
				for (String name : ((Named) o).getName())
				{
					if (name.equals(SMName)) return true;
				}
			}
		}

		return false;
	}
}
