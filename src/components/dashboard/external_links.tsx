import { Flex, Icon, Link } from "@chakra-ui/react";
import { FaGithub } from "react-icons/fa";
import { RiTwitterXFill } from "react-icons/ri";
import { SiGitbook } from "react-icons/si";

const links = [
	{ address: "https://github.com/bear-market-labs", icon: FaGithub },
	{ address: "https://x.com/bearmarketlabs", icon: RiTwitterXFill },
	{ address: "https://docs.inversebondingcurve.com/", icon: SiGitbook },
];

const ExternalLinks = () => (
	<Flex gap='7' ml='7' mb='7' flexGrow='0' flexShrink={0}>
		{links.map((link, i) => (
			<Link key={i} href={link.address} isExternal>
				<Icon as={link.icon} fontFamily='l' />
			</Link>
		))}
	</Flex>
);

export default ExternalLinks;
