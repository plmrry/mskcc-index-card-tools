package org.pathwaycommons.pathwaycards.extractor;

import org.biopax.paxtools.model.level3.*;
import org.biopax.paxtools.pattern.Pattern;
import org.biopax.paxtools.pattern.PatternBox;
import org.biopax.paxtools.pattern.constraint.*;
import org.biopax.paxtools.pattern.util.Blacklist;
import org.biopax.paxtools.pattern.util.RelType;

import static org.biopax.paxtools.pattern.constraint.ConBox.*;

/**
 * @author Ozgun Babur
 */
public class PatternGenerator
{
	//--- Differential modification patterns

	public static Pattern controlsStateChange()
	{
		Pattern p = new Pattern(PhysicalEntity.class, "controller PE");
		p.add(peToControl(), "controller PE", "Control");
		p.add(controlToConv(), "Control", "Conversion");
		p.add(new Participant(RelType.INPUT, true), "Control", "Conversion", "input PE");
		p.add(linkToSpecific(), "input PE", "input simple PE");
		p.add(new Type(SequenceEntity.class), "input simple PE");
		p.add(peToER(), "input simple PE", "changed generic ER");
		p.add(new ConversionSide(ConversionSide.Type.OTHER_SIDE), "input PE", "Conversion", "output PE");
		p.add(equal(false), "input PE", "output PE");
		p.add(linkToSpecific(), "output PE", "output simple PE");
		p.add(peToER(), "output simple PE", "changed generic ER");
		p.add(linkedER(false), "changed generic ER", "changed ER");

		return p;
	}

	public static Pattern controlsStateChangeButIsParticipant()
	{
		Pattern p = new Pattern(PhysicalEntity.class, "controller PE");
		p.add(participatesInConv(), "controller PE", "Conversion");
		p.add(left(), "Conversion", "controller PE");
		p.add(right(), "Conversion", "controller PE");

		PatternBox.stateChange(p, null);

		p.add(equal(false), "controller PE", "input PE");
		p.add(equal(false), "controller PE", "output PE");

		return p;
	}

	public static Pattern controlsStateChangeThroughControllerSmallMolecule(Blacklist blacklist)
	{
		Pattern p = new Pattern(PhysicalEntity.class, "upper controller PE");
		p.add(peToControl(), "upper controller PE", "upper Control");
		p.add(controlToConv(), "upper Control", "upper Conversion");
		p.add(new NOT(participant()), "upper Conversion", "upper controller PE");
		p.add(new Participant(RelType.OUTPUT, blacklist), "upper Conversion", "controller PE");
		p.add(type(SmallMolecule.class), "controller PE");
		if (blacklist != null) p.add(new NonUbique(blacklist), "controller PE");

		// the linker small mol is at also an input
		p.add(new NOT(new ConstraintChain(
				new ConversionSide(ConversionSide.Type.OTHER_SIDE), linkToSpecific())),
			"controller PE", "upper Conversion", "controller PE");

		p.add(peToControl(), "controller PE", "Control");
		p.add(controlToConv(), "Control", "Conversion");
		p.add(equal(false), "upper Conversion", "Conversion");

		PatternBox.stateChange(p, "Control");

		p.add(type(SequenceEntityReference.class), "changed ER");

		return p;
	}

	//--- Binding patterns

	public static Pattern bindingPattern()
	{
		Pattern p = new Pattern(PhysicalEntity.class, "PE1");
		p.add(participatesInConv(), "PE1", "Conversion");
		p.add(new ConversionSide(ConversionSide.Type.SAME_SIDE), "PE1", "Conversion", "PE2");
		p.add(new HasSmallerID(), "PE1", "PE2");
		p.add(new ConversionSide(ConversionSide.Type.OTHER_SIDE), "PE1", "Conversion", "Complex");
		p.add(type(Complex.class), "Complex");
		p.add(complexMembers(), "Complex", "PE1");
		p.add(complexMembers(), "Complex", "PE2");
		return p;
	}

	//--- Expression patterns

	public static Pattern expressionPattern()
	{
		Pattern p = new Pattern(PhysicalEntity.class, "TF PE");
		p.add(peToControl(), "TF PE", "Control");
		p.add(controlToTempReac(), "Control", "TempReac");
		p.add(product(), "TempReac", "product PE");
		p.add(linkToSpecific(), "product PE", "product SPE");
		p.add(new Type(SequenceEntity.class), "product SPE");
		p.add(peToER(), "product SPE", "product generic ER");
		p.add(linkedER(false), "product generic ER", "product ER");
		return p;
	}

	//--- GTP exchange patterns

	public static Pattern controlsSmallMolExchangePattern(String oldMol, String newMol)
	{
		Pattern p = new Pattern(PhysicalEntity.class, "controller PE");
		p.add(peToControl(), "controller PE", "Control");
		p.add(controlToConv(), "Control", "Conversion");
		p.add(new NOT(participant()), "Conversion", "controller PE");
		p.add(new Participant(RelType.INPUT, true), "Conversion", "Control", "input PE");
		p.add(type(Complex.class), "input PE");
		p.add(new ComplexContainsSmallMol(oldMol), "input PE");
		p.add(complexMembers(), "input PE", "input SPE");
		p.add(type(Protein.class), "input SPE");
		p.add(new ConversionSide(ConversionSide.Type.OTHER_SIDE), "input PE", "Conversion", "output PE");
		p.add(equal(false), "input PE", "output PE");
		p.add(type(Complex.class), "output PE");
		p.add(new ComplexContainsSmallMol(newMol), "output PE");
		p.add(complexMembers(), "output PE", "input SPE");
		return p;
	}

	public static Pattern exchangesSmallMoleculesPattern(String oldMol, String newMol)
	{
		Pattern p = new Pattern(Conversion.class, "Conversion");
		p.add(new Participant(RelType.INPUT), "Conversion", "input Complex1");
		p.add(type(Complex.class), "input Complex1");
		p.add(new Participant(RelType.INPUT), "Conversion", "input Complex2");
		p.add(type(Complex.class), "input Complex2");
		p.add(equal(false), "input Complex1", "input Complex2");
		p.add(new ComplexContainsSmallMol(newMol), "input Complex1");
		p.add(new ComplexContainsSmallMol(oldMol), "input Complex2");
		p.add(complexMembers(), "input Complex1", "Protein A");
		p.add(complexMembers(), "input Complex2", "Protein B");
		p.add(type(Protein.class), "Protein A");
		p.add(type(Protein.class), "Protein B");
		p.add(new ConversionSide(ConversionSide.Type.OTHER_SIDE), "input Complex1", "Conversion", "output Complex1");
		p.add(type(Complex.class), "output Complex1");
		p.add(equal(false), "input Complex1", "output Complex1");
		p.add(equal(false), "input Complex2", "output Complex1");
		p.add(new ComplexContainsSmallMol(oldMol), "output Complex1");
		p.add(complexMembers(), "output Complex1", "Protein A");
		p.add(new ConversionSide(ConversionSide.Type.OTHER_SIDE), "input Complex1", "Conversion", "output Complex2");
		p.add(type(Complex.class), "output Complex2");
		p.add(equal(false), "output Complex1", "output Complex2");
		p.add(equal(false), "input Complex1", "output Complex2");
		p.add(equal(false), "input Complex2", "output Complex2");
		p.add(new ComplexContainsSmallMol(newMol), "output Complex2");
		p.add(complexMembers(), "output Complex2", "Protein B");
		return p;
	}

	public static Pattern controlsSmallMolActivationPattern(String oldMol, String newMol)
	{
		Pattern p = new Pattern(PhysicalEntity.class, "controller PE");
		p.add(peToControl(), "controller PE", "Control");
		p.add(controlToConv(), "Control", "Conversion");
		p.add(new NOT(participant()), "Conversion", "controller PE");
		p.add(new Participant(RelType.INPUT, true), "Conversion", "Control", "input SM");
		p.add(type(SmallMolecule.class), "input SM");
		p.add(new Field("Named/name", Field.Operation.INTERSECT, newMol), "input SM");
		p.add(new Participant(RelType.INPUT, true), "Conversion", "Control", "input PE");
		p.add(equal(false), "input PE", "input SM");
		p.add(linkToSimple(null), "input PE", "input SPE");
		p.add(complexMembers(), "input PE", "input SPE");
		p.add(type(Protein.class), "input SPE");
		p.add(new ConversionSide(ConversionSide.Type.OTHER_SIDE), "input PE", "Conversion", "output SM");
		p.add(type(SmallMolecule.class), "output SM");
		p.add(new Field("Named/name", Field.Operation.INTERSECT, oldMol), "output SM");
		p.add(new ConversionSide(ConversionSide.Type.OTHER_SIDE), "input PE", "Conversion", "output PE");
		p.add(equal(false), "output SM", "output PE");
		p.add(equal(false), "input PE", "output PE");
		p.add(linkToSimple(null), "output PE", "output SPE");
		p.add(new DifferentialActivityLabel(null), "input SPE", "output SPE");
		return p;
	}



}
